# apps/enrollments/views.py
import logging
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


class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar inscripciones formales.

    Endpoints:
      GET    /api/enrollments/                    - listar inscripciones
      POST   /api/enrollments/                    - crear inscripción desde pre-inscripción aceptada
      GET    /api/enrollments/{id}/               - detalle de inscripción
      PATCH  /api/enrollments/{id}/               - actualizar grupo/horario/estado
      POST   /api/enrollments/{id}/upload-document/ - subir documento
      POST   /api/enrollments/{id}/review-document/{doc_id}/ - revisar documento
      GET    /api/enrollments/my-enrollment/      - inscripción del alumno autenticado
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
        if self.action in ['create', 'partial_update']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()

    # ------------------------------------------------------------------
    # CREATE: inscribir desde una pre-inscripción aceptada
    # ------------------------------------------------------------------

    def create(self, request, *args, **kwargs):
        """
        POST /api/enrollments/
        Body: { "pre_enrollment_id": "<uuid>", "group": "...", "schedule": "..." }

        1. Valida que la pre-inscripción exista y esté en estado 'accepted'.
        2. Genera matrícula única.
        3. Genera correo institucional único y lo guarda en students.institutional_email.
        4. Crea el registro de inscripción.
        """
        serializer = EnrollmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pre_enrollment_id = serializer.validated_data['pre_enrollment_id']
        group = serializer.validated_data.get('group', '') or None
        schedule = serializer.validated_data.get('schedule', '') or None

        # Verificar que la pre-inscripción exista y esté aceptada
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

        # Verificar que no exista ya una inscripción para esta pre-inscripción
        if Enrollment.objects.filter(pre_enrollment=pre_enrollment).exists():
            return Response(
                {'error': 'Ya existe una inscripción para esta pre-inscripción'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student = pre_enrollment.student
        program = pre_enrollment.program
        period = pre_enrollment.period

        # Generar matrícula única
        try:
            matricula = generate_matricula(
                program_code=program.code,
                period_year=str(period.start_date.year),
            )
        except ValueError as exc:
            logger.error('[EnrollmentViewSet.create] Error generando matrícula: %s', exc)
            return Response(
                {'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Generar y guardar correo institucional en students.institutional_email
        try:
            if not student.institutional_email:
                institutional_email = generate_institutional_email(student)
                student.institutional_email = institutional_email
                student.save(update_fields=['institutional_email'])
                logger.info(
                    '[EnrollmentViewSet.create] Correo institucional asignado: %s → %s',
                    student.pk,
                    institutional_email,
                )
        except ValueError as exc:
            logger.error(
                '[EnrollmentViewSet.create] Error generando correo institucional: %s', exc
            )
            return Response(
                {'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Crear inscripción
        enrollment = Enrollment(
            student=student,
            program=program,
            period=period,
            pre_enrollment=pre_enrollment,
            matricula=matricula,
            status='active',
            group=group,
            schedule=schedule,
            enrolled_at=timezone.now(),
        )
        enrollment.save()

        logger.info(
            '[EnrollmentViewSet.create] Inscripción creada: matricula=%s student=%s',
            matricula,
            student.pk,
        )

        response_serializer = EnrollmentDetailSerializer(
            enrollment, context={'request': request}
        )
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
        POST /api/enrollments/{id}/upload-document/
        Body (multipart): document_type, file
        """
        enrollment = self.get_object()

        # Alumnos solo pueden subir documentos a su propia inscripción
        if request.user.role == 'alumno':
            if (
                not hasattr(request.user, 'student_profile')
                or enrollment.student != request.user.student_profile
            ):
                return Response(
                    {'error': 'No tiene permiso para subir documentos a esta inscripción'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = EnrollmentDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_type = serializer.validated_data['document_type']
        uploaded_file = request.FILES.get('file')
        mime_type = uploaded_file.content_type if uploaded_file else None

        existing = enrollment.documents.filter(document_type=document_type).first()
        is_reupload_of_rejected = existing and existing.status == 'rejected'

        if not is_reupload_of_rejected and existing and existing.status in ('pending', 'approved'):
            return Response(
                {'error': 'Este tipo de documento ya fue subido. Solo puedes reemplazar documentos rechazados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing and existing.status == 'rejected':
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
    # REVIEW DOCUMENT
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
        POST /api/enrollments/{id}/review-document/{doc_id}/
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
        document.status = 'approved' if action_type == 'approve' else 'rejected'
        document.reviewer_notes = serializer.validated_data.get('reviewer_notes', '')
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save()

        return Response({
            'message': f"Documento {'aprobado' if action_type == 'approve' else 'rechazado'} correctamente",
            'document': EnrollmentDocumentSerializer(document, context={'request': request}).data,
        })

    # ------------------------------------------------------------------
    # MY ENROLLMENT (alumno autenticado)
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='my-enrollment')
    def my_enrollment(self, request):
        """
        GET /api/enrollments/my-enrollment/
        Devuelve la inscripción activa del alumno autenticado.
        """
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'No tiene perfil de estudiante'},
                status=status.HTTP_404_NOT_FOUND,
            )

        student = request.user.student_profile
        enrollments = (
            Enrollment.objects.select_related('student', 'program', 'period')
            .prefetch_related('documents')
            .filter(student=student)
            .order_by('-enrolled_at')
        )

        page = self.paginate_queryset(enrollments)
        if page is not None:
            serializer = EnrollmentDetailSerializer(
                page, many=True, context={'request': request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = EnrollmentDetailSerializer(
            enrollments, many=True, context={'request': request}
        )
        return Response(serializer.data)
