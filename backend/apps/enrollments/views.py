# apps/enrollments/views.py
import csv
import logging
from django.conf import settings
from django.http import HttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import Enrollment, EnrollmentDocument
from .serializers import (
    EnrollmentListSerializer,
    EnrollmentDetailSerializer,
    EnrollmentCreateSerializer,
    EnrollmentUpdateSerializer,
    EnrollmentDocumentSerializer,
    EnrollmentDocumentUploadSerializer,
    EnrollmentDocumentReviewSerializer,
)
from .generators import generate_matricula, generate_institutional_email
from apps.pre_enrollment.models import PreEnrollment
from apps.pre_enrollment.permissions import IsAdminOrServiciosEscolares

logger = logging.getLogger(__name__)

STAFF_ROLES = ['admin', 'servicios_escolares_jefe', 'servicios_escolares']

# Documentos exactamente requeridos para completar la inscripción
REQUIRED_DOC_TYPES = ['numero_seguridad_social', 'certificado_bachillerato']


class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar inscripciones formales.

    Endpoints:
      GET    /api/enrollments/enrollments/                       - listar inscripciones
      POST   /api/enrollments/enrollments/                       - crear inscripción desde pre-inscripción aceptada
      GET    /api/enrollments/enrollments/{id}/                  - detalle de inscripción
      PATCH  /api/enrollments/enrollments/{id}/                  - actualizar grupo/horario/estado
      POST   /api/enrollments/enrollments/{id}/upload-document/  - subir documento
      POST   /api/enrollments/enrollments/{id}/review-document/{doc_id}/ - revisar documento
      POST   /api/enrollments/enrollments/{id}/confirm/          - confirmar inscripción con grupo y horario
      GET    /api/enrollments/enrollments/my-enrollment/         - inscripción del alumno autenticado
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['status', 'program', 'period']
    search_fields = [
        'student__first_name',
        'student__last_name',
        'student__curp',
        'matricula',
        'program__name',
        'program__code',
    ]
    ordering_fields = ['enrolled_at', 'created_at', 'matricula']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return EnrollmentListSerializer
        if self.action == 'create':
            return EnrollmentCreateSerializer
        if self.action == 'partial_update':
            return EnrollmentUpdateSerializer
        return EnrollmentDetailSerializer

    def get_queryset(self):
        qs = Enrollment.objects.select_related(
            'student',
            'student__user',
            'program',
            'period',
            'pre_enrollment',
        ).prefetch_related('documents')

        user = self.request.user
        if user.role == 'alumno':
            if hasattr(user, 'student_profile'):
                qs = qs.filter(student=user.student_profile)
            else:
                qs = qs.none()
        elif user.role == 'servicios_escolares':
            program_ids = list(
                user.get_accessible_programs().values_list('id', flat=True)
            )
            qs = qs.filter(program_id__in=program_ids)

        return qs

    def get_permissions(self):
        if self.action in ['create', 'partial_update', 'confirm']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()

    # ------------------------------------------------------------------
    # CREATE: inscribir desde una pre-inscripción aceptada
    # ------------------------------------------------------------------

    def create(self, request, *args, **kwargs):
        """
        POST /api/enrollments/enrollments/
        Body: { "pre_enrollment_id": "<uuid>", "group": "...", "schedule": "..." }
        """
        serializer = EnrollmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pre_enrollment_id = serializer.validated_data['pre_enrollment_id']
        group = serializer.validated_data.get('group', '') or None
        schedule = serializer.validated_data.get('schedule', '') or None

        try:
            pre_enrollment = PreEnrollment.objects.select_related(
                'student', 'program', 'period'
            ).get(pk=pre_enrollment_id)
        except PreEnrollment.DoesNotExist:
            return Response(
                {'error': 'Pre-inscripción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if pre_enrollment.status != 'accepted':
            return Response(
                {
                    'error': (
                        f"La pre-inscripción debe estar en estado 'accepted', "
                        f"estado actual: '{pre_enrollment.status}'"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Enrollment.objects.filter(pre_enrollment=pre_enrollment).exists():
            return Response(
                {'error': 'Ya existe una inscripción para esta pre-inscripción'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student = pre_enrollment.student
        program = pre_enrollment.program
        period = pre_enrollment.period

        try:
            matricula = generate_matricula(
                program_code=program.code,
                period_year=str(period.start_date.year),
            )
        except ValueError as exc:
            logger.error('[EnrollmentViewSet.create] Error generando matrícula: %s', exc)
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            if not student.institutional_email:
                institutional_email = generate_institutional_email(student)
                student.institutional_email = institutional_email
                student.save(update_fields=['institutional_email'])
        except ValueError as exc:
            logger.error('[EnrollmentViewSet.create] Error generando correo institucional: %s', exc)
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        enrollment = Enrollment(
            student=student,
            program=program,
            period=period,
            pre_enrollment=pre_enrollment,
            matricula=matricula,
            status='pending_docs',
            group=group,
            schedule=schedule,
            enrolled_at=timezone.now(),
        )
        enrollment.save()

        # Crear registros placeholder para los documentos requeridos
        for doc_type in REQUIRED_DOC_TYPES:
            EnrollmentDocument.objects.get_or_create(
                enrollment=enrollment,
                document_type=doc_type,
                defaults={'status': 'pending', 'file_name': ''},
            )

        logger.info(
            '[EnrollmentViewSet.create] Inscripción creada: matricula=%s student=%s',
            matricula, student.pk,
        )

        response_serializer = EnrollmentDetailSerializer(enrollment, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # UPLOAD DOCUMENT
    # ------------------------------------------------------------------

    @action(
        detail=True,
        methods=['post'],
        url_path='upload-document',
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_document(self, request, pk=None):
        """
        POST /api/enrollments/enrollments/{id}/upload-document/
        Body (multipart): document_type, file
        """
        enrollment = self.get_object()

        if request.user.role == 'alumno':
            if (
                not hasattr(request.user, 'student_profile')
                or enrollment.student != request.user.student_profile
            ):
                return Response(
                    {'error': 'No tiene permiso para subir documentos a esta inscripción'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if enrollment.status not in ('pending_docs',):
            # Allow re-upload if a doc was rejected regardless of enrollment status
            pass  # We'll check at document level

        serializer = EnrollmentDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_type = serializer.validated_data['document_type']
        uploaded_file = request.FILES.get('file')
        mime_type = uploaded_file.content_type if uploaded_file else None

        existing = enrollment.documents.filter(document_type=document_type).first()
        # Placeholder: registro sin archivo (creado al crear la inscripción)
        is_placeholder = existing and not existing.file_path
        is_rejected = existing and existing.status == 'rejected'

        if existing and not is_placeholder and not is_rejected and existing.status in ('pending', 'approved'):
            return Response(
                {'error': 'Este tipo de documento ya fue subido. Solo puedes reemplazar documentos rechazados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing and (is_placeholder or is_rejected):
            # Actualizar el registro existente (placeholder o rechazado)
            existing.file_path = serializer.validated_data['file_path']
            existing.status = 'pending'
            existing.reviewer_notes = None
            existing.reviewed_by = None
            existing.reviewed_at = None
            if uploaded_file:
                existing.file_name = uploaded_file.name
                existing.file_size = uploaded_file.size
            existing.mime_type = mime_type
            existing.save()
            document = existing
        else:
            document = serializer.save(enrollment=enrollment)
            if document.file_path:
                document.file_name = document.file_path.name
                document.file_size = document.file_path.size
                document.mime_type = mime_type
                document.save()

        return Response(
            EnrollmentDocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ------------------------------------------------------------------
    # REVIEW DOCUMENT (staff)
    # ------------------------------------------------------------------

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        parser_classes=[JSONParser],
        url_path=r'review-document/(?P<doc_id>[^/.]+)',
    )
    def review_document(self, request, pk=None, doc_id=None):
        """
        POST /api/enrollments/enrollments/{id}/review-document/{doc_id}/
        Body: { "action": "approve" | "reject", "reviewer_notes": "..." }
        """
        enrollment = self.get_object()

        try:
            document = enrollment.documents.get(pk=doc_id)
        except EnrollmentDocument.DoesNotExist:
            return Response(
                {'error': 'Documento no encontrado'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EnrollmentDocumentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        reviewer_notes = serializer.validated_data.get('reviewer_notes', '') or ''
        document.status = 'approved' if action_type == 'approve' else 'rejected'
        document.reviewer_notes = reviewer_notes
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save()

        if action_type == 'approve':
            # Verificar si todos los documentos requeridos ya están aprobados
            required_docs = enrollment.documents.filter(document_type__in=REQUIRED_DOC_TYPES)
            all_approved = (
                required_docs.count() == len(REQUIRED_DOC_TYPES)
                and required_docs.filter(status='approved').count() == len(REQUIRED_DOC_TYPES)
            )
            if all_approved and enrollment.status == 'pending_docs':
                enrollment.status = 'enrolled'
                enrollment.save(update_fields=['status', 'updated_at'])
                logger.info(
                    '[EnrollmentViewSet.review_document] Inscripción completada: enrollment=%s',
                    enrollment.pk,
                )
                from .tasks import send_enrollment_completed_email_task
                try:
                    send_enrollment_completed_email_task.delay(str(enrollment.id))
                except Exception:
                    from .email_service import send_enrollment_completed_email
                    send_enrollment_completed_email(enrollment)

        elif action_type == 'reject':
            from .tasks import send_enrollment_document_rejected_email_task
            try:
                send_enrollment_document_rejected_email_task.delay(str(document.id), reviewer_notes)
            except Exception:
                from .email_service import send_enrollment_document_rejected_email
                send_enrollment_document_rejected_email(document, reviewer_notes)

        return Response({
            'message': f"Documento {'aprobado' if action_type == 'approve' else 'rechazado'} correctamente",
            'document': EnrollmentDocumentSerializer(document, context={'request': request}).data,
        })

    # ------------------------------------------------------------------
    # CONFIRM ENROLLMENT (staff assigns group/schedule + moves to pending_payment)
    # ------------------------------------------------------------------

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        parser_classes=[JSONParser],
        url_path='confirm',
    )
    def confirm(self, request, pk=None):
        """
        POST /api/enrollments/enrollments/{id}/confirm/
        Body: { "group": "...", "schedule": "..." }

        Valida que todos los documentos estén aprobados, asigna grupo y horario
        y mueve el enrollment a estado pending_payment.
        """
        enrollment = self.get_object()

        if enrollment.status != 'pending_docs':
            return Response(
                {'error': 'La inscripción debe estar en estado pending_docs para confirmar'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = request.data.get('group', '').strip()
        schedule = request.data.get('schedule', '').strip()

        if not group or not schedule:
            return Response(
                {'error': 'Los campos group y schedule son requeridos'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        docs = list(enrollment.documents.values_list('status', flat=True))
        if not docs:
            return Response(
                {'error': 'El alumno no ha subido ningún documento de inscripción'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not all(s == 'approved' for s in docs):
            return Response(
                {'error': 'Todos los documentos deben estar aprobados antes de confirmar'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment.group = group
        enrollment.schedule = schedule
        enrollment.status = 'pending_payment'
        enrollment.save()

        serializer = EnrollmentDetailSerializer(enrollment, context={'request': request})
        return Response({
            'message': 'Inscripción confirmada. El alumno debe realizar el pago de inscripción.',
            'enrollment': serializer.data,
        })

    # ------------------------------------------------------------------
    # EXPORT CSV (jefe de servicios escolares / admin)
    # ------------------------------------------------------------------

    @action(
        detail=False,
        methods=['get'],
        url_path='export-csv',
        permission_classes=[IsAdminOrServiciosEscolares],
    )
    def export_csv(self, request):
        """
        GET /api/enrollments/enrollments/export-csv/
        Descarga un CSV con inscripciones activas para el área de TI.
        Solo accesible para admin y servicios_escolares_jefe.
        """
        if request.user.role not in ('admin', 'servicios_escolares_jefe'):
            return Response(
                {'error': 'Solo el jefe de servicios escolares o admin puede exportar'},
                status=status.HTTP_403_FORBIDDEN,
            )

        EXPORT_STATUSES = [
            'pending_docs', 'docs_submitted', 'docs_approved',
            'pending_payment', 'payment_submitted', 'payment_validated', 'enrolled',
        ]
        domain = getattr(settings, 'INSTITUTIONAL_EMAIL_DOMAIN', 'universidad.edu.mx')

        qs = (
            Enrollment.objects
            .select_related('student', 'program', 'period')
            .filter(status__in=EXPORT_STATUSES)
            .order_by('period__name', 'program__code', 'matricula')
        )

        http_response = HttpResponse(content_type='text/csv; charset=utf-8')
        http_response['Content-Disposition'] = 'attachment; filename="inscripciones.csv"'
        http_response.write('\ufeff')  # BOM para Excel

        writer = csv.writer(http_response)
        writer.writerow([
            'matricula', 'nombre', 'apellido_paterno', 'apellido_materno',
            'correo_institucional', 'programa', 'periodo', 'grupo', 'horario',
        ])

        for enrollment in qs:
            student = enrollment.student
            institutional_email = (
                student.institutional_email
                or f"{enrollment.matricula}@{domain}"
            )
            writer.writerow([
                enrollment.matricula,
                student.first_name,
                student.last_name,
                getattr(student, 'second_last_name', '') or '',
                institutional_email,
                enrollment.program.code,
                enrollment.period.name,
                enrollment.group or '',
                enrollment.schedule or '',
            ])

        return http_response

    # ------------------------------------------------------------------
    # MY ENROLLMENT (alumno autenticado)
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='my-enrollment')
    def my_enrollment(self, request):
        """
        GET /api/enrollments/enrollments/my-enrollment/
        Devuelve la(s) inscripción(es) del alumno autenticado.
        También accesible a aspirantes que ya tienen enrollment.
        """
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'No tiene perfil de estudiante'},
                status=status.HTTP_404_NOT_FOUND,
            )

        student = request.user.student_profile
        enrollments = (
            Enrollment.objects.select_related('student', 'student__user', 'program', 'period')
            .prefetch_related('documents')
            .filter(student=student)
            .order_by('-enrolled_at')
        )

        page = self.paginate_queryset(enrollments)
        if page is not None:
            serializer = EnrollmentDetailSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = EnrollmentDetailSerializer(enrollments, many=True, context={'request': request})
        return Response(serializer.data)
