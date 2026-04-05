# apps/pre_enrollment/views.py
import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count, Avg, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

logger = logging.getLogger(__name__)

from .models import PreEnrollment, Document, Announcement
from .serializers import (
    PreEnrollmentListSerializer,
    PreEnrollmentDetailSerializer,
    PreEnrollmentCreateSerializer,
    PreEnrollmentUpdateSerializer,
    DocumentSerializer,
    DocumentUploadSerializer,
    DocumentReviewSerializer,
    ScheduleExamSerializer,
    EnterScoreSerializer,
    ChangeStatusSerializer,
    AnnouncementSerializer,
    PreEnrollmentStatsSerializer,
)
from .filters import PreEnrollmentFilter, DocumentFilter
from .permissions import IsAdminOrServiciosEscolares, IsOwnerOrStaff
from apps.users.permissions import HasProgramAccess 


class PreEnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar pre-inscripciones
    """
    
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = PreEnrollmentFilter
    search_fields = [
        'student__first_name',
        'student__last_name',
        'student__curp',
        'program__name',
        'program__code',
    ]
    ordering_fields = [
        'created_at',
        'submitted_at',
        'exam_date',
        'exam_score'
    ]
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PreEnrollmentListSerializer
        elif self.action == 'create':
            return PreEnrollmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PreEnrollmentUpdateSerializer
        return PreEnrollmentDetailSerializer
    
    def get_queryset(self):
        """Filtrar pre-inscripciones por programas accesibles"""
        queryset = PreEnrollment.objects.select_related(
            'student',
            'student__user',
            'program',
            'period',
            'reviewed_by',
            'approved_by'
        ).prefetch_related('documents').all()

        # Filtrar por programas accesibles si es servicios_escolares
        if self.request.user.role == 'servicios_escolares':
            program_ids = list(
                self.request.user.get_accessible_programs().values_list('id', flat=True)
            )
            logger.debug(
                '[PreEnrollmentViewSet.get_queryset] user=%s program_ids=%s',
                self.request.user.email, program_ids
            )
            queryset = queryset.filter(program_id__in=program_ids)
            logger.debug(
                '[PreEnrollmentViewSet.get_queryset] → %d pre-inscripciones tras filtrar',
                queryset.count()
            )

        return queryset
    
    def get_permissions(self):
        """Permisos específicos por acción"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminOrServiciosEscolares()]
        elif self.action == 'retrieve':
            return [IsOwnerOrStaff(), HasProgramAccess()]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """
        Enviar solicitud de pre-inscripción
        
        POST /api/pre-enrollments/{id}/submit/
        """
        pre_enrollment = self.get_object()
        
        if not pre_enrollment.can_submit():
            return Response(
                {'error': 'La solicitud no puede ser enviada en su estado actual'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not pre_enrollment.has_all_documents:
            return Response(
                {'error': 'Debe subir todos los documentos requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pre_enrollment.status = 'submitted'
        pre_enrollment.submitted_at = timezone.now()
        pre_enrollment.save()
        
        serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': 'Solicitud enviada correctamente',
            'pre_enrollment': serializer.data
        })
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='review'
    )
    def review(self, request, pk=None):
        """
        Revisar documentos de pre-inscripción
        
        POST /api/pre-enrollments/{id}/review/
        Body: {
            "new_status": "documents_approved" | "documents_rejected",
            "notes": "observaciones"
        }
        """
        pre_enrollment = self.get_object()
        serializer = ChangeStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not pre_enrollment.can_review():
            return Response(
                {'error': 'La solicitud no puede ser revisada en su estado actual'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_status = serializer.validated_data['new_status']
        if new_status not in ['documents_approved', 'documents_rejected']:
            return Response(
                {'error': 'Estado inválido para esta acción'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pre_enrollment.status = new_status
        pre_enrollment.reviewed_at = timezone.now()
        pre_enrollment.reviewed_by = request.user
        
        if serializer.validated_data.get('notes'):
            pre_enrollment.notes = serializer.validated_data['notes']
        
        # Si se aprueban documentos, pasar a pago pendiente
        if new_status == 'documents_approved':
            pre_enrollment.status = 'payment_pending'
        
        pre_enrollment.save()
        
        response_serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': 'Revisión completada',
            'pre_enrollment': response_serializer.data
        })
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='schedule-exam'
    )
    def schedule_exam(self, request, pk=None):
        """
        Programar examen de admisión
        
        POST /api/pre-enrollments/{id}/schedule-exam/
        Body: {
            "exam_date": "2026-03-15T10:00:00Z",
            "exam_mode": "presencial" | "en_linea",
            "exam_location": "Aula 101" | "https://meet.google.com/xxx"
        }
        """
        pre_enrollment = self.get_object()
        serializer = ScheduleExamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not pre_enrollment.can_schedule_exam():
            return Response(
                {'error': 'No se puede programar examen en el estado actual'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pre_enrollment.exam_date = serializer.validated_data['exam_date']
        pre_enrollment.exam_mode = serializer.validated_data['exam_mode']
        pre_enrollment.exam_location = serializer.validated_data['exam_location']
        pre_enrollment.status = 'exam_scheduled'
        pre_enrollment.save()
        
        response_serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': 'Examen programado correctamente',
            'pre_enrollment': response_serializer.data
        })
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='enter-score'
    )
    def enter_score(self, request, pk=None):
        """
        Ingresar calificación del examen
        
        POST /api/pre-enrollments/{id}/enter-score/
        Body: {
            "exam_score": 85.5,
            "notes": "observaciones"
        }
        """
        pre_enrollment = self.get_object()
        serializer = EnterScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pre_enrollment.exam_score = serializer.validated_data['exam_score']
        pre_enrollment.exam_completed_at = timezone.now()
        pre_enrollment.status = 'exam_completed'
        
        if serializer.validated_data.get('notes'):
            pre_enrollment.notes = serializer.validated_data['notes']
        
        pre_enrollment.save()
        
        response_serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': 'Calificación registrada',
            'pre_enrollment': response_serializer.data
        })
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='accept'
    )
    def accept(self, request, pk=None):
        """
        Aceptar aspirante
        
        POST /api/pre-enrollments/{id}/accept/
        """
        pre_enrollment = self.get_object()
        
        if pre_enrollment.status != 'exam_completed':
            return Response(
                {'error': 'El aspirante debe haber completado el examen'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar cupo
        if not pre_enrollment.program.has_capacity(pre_enrollment.period):
            return Response(
                {'error': 'No hay cupo disponible en este programa'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pre_enrollment.status = 'accepted'
        pre_enrollment.approved_at = timezone.now()
        pre_enrollment.approved_by = request.user
        pre_enrollment.save()
        
        serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': 'Aspirante aceptado',
            'pre_enrollment': serializer.data
        })
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='reject'
    )
    def reject(self, request, pk=None):
        """
        Rechazar aspirante
        
        POST /api/pre-enrollments/{id}/reject/
        Body: {"notes": "motivo del rechazo"}
        """
        pre_enrollment = self.get_object()
        
        if pre_enrollment.status != 'exam_completed':
            return Response(
                {'error': 'El aspirante debe haber completado el examen'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pre_enrollment.status = 'rejected'
        pre_enrollment.approved_at = timezone.now()
        pre_enrollment.approved_by = request.user
        
        if request.data.get('notes'):
            pre_enrollment.notes = request.data['notes']
        
        pre_enrollment.save()
        
        serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': 'Aspirante rechazado',
            'pre_enrollment': serializer.data
        })

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='set-exam-result',
    )
    def set_exam_result(self, request, pk=None):
        """
        Marca el resultado final de un aspirante directamente desde estado
        'payment_validated' o 'exam_completed', creando automáticamente el
        registro de inscripción si la decisión es 'accepted'.

        POST /api/pre-enrollments/pre-enrollments/{id}/set-exam-result/
        Body: {
            "decision": "accepted" | "rejected",
            "notes": "...",
            "exam_score": 85.5  (opcional)
        }
        """
        pre_enrollment = self.get_object()

        if pre_enrollment.status not in ('payment_validated', 'exam_completed'):
            return Response(
                {
                    'error': (
                        "La pre-inscripción debe estar en estado 'payment_validated' "
                        "o 'exam_completed'"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = request.data.get('decision')
        notes = request.data.get('notes', '')
        exam_score = request.data.get('exam_score')

        if decision not in ('accepted', 'rejected'):
            return Response(
                {'error': "El campo 'decision' debe ser 'accepted' o 'rejected'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == 'rejected' and not notes:
            return Response(
                {'error': "El campo 'notes' es requerido al rechazar"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Registrar calificación si se proporciona
        if exam_score is not None:
            try:
                score_value = float(exam_score)
                if not (0 <= score_value <= 100):
                    raise ValueError
                pre_enrollment.exam_score = score_value
                pre_enrollment.exam_completed_at = timezone.now()
            except (ValueError, TypeError):
                return Response(
                    {'error': 'exam_score debe ser un número entre 0 y 100'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        pre_enrollment.status = decision
        pre_enrollment.approved_at = timezone.now()
        pre_enrollment.approved_by = request.user
        if notes:
            pre_enrollment.notes = notes
        pre_enrollment.save()

        if decision == 'accepted':
            from apps.enrollments.models import Enrollment
            from apps.enrollments.generators import generate_matricula, generate_institutional_email

            student = pre_enrollment.student
            program = pre_enrollment.program
            period = pre_enrollment.period

            # Verificar que no exista ya una inscripción
            if not Enrollment.objects.filter(pre_enrollment=pre_enrollment).exists():
                try:
                    matricula = generate_matricula(
                        program_code=program.code,
                        period_year=str(period.start_date.year),
                    )
                except ValueError as exc:
                    logger.error('[set_exam_result] Error generando matrícula: %s', exc)
                    return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                try:
                    if not student.institutional_email:
                        institutional_email = generate_institutional_email(student)
                        student.institutional_email = institutional_email
                        student.save(update_fields=['institutional_email'])
                except ValueError as exc:
                    logger.error('[set_exam_result] Error generando correo institucional: %s', exc)
                    return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                enrollment = Enrollment(
                    student=student,
                    program=program,
                    period=period,
                    pre_enrollment=pre_enrollment,
                    matricula=matricula,
                    status='pending_documents',
                    enrolled_at=timezone.now(),
                )
                enrollment.save()

                logger.info(
                    '[set_exam_result] Inscripción creada: matricula=%s student=%s',
                    matricula, student.pk,
                )

                from apps.enrollments.tasks import send_enrollment_accepted_email_task
                try:
                    send_enrollment_accepted_email_task.delay(str(enrollment.id))
                except Exception:
                    from apps.enrollments.email_service import send_enrollment_accepted_email
                    send_enrollment_accepted_email(enrollment)
        else:
            from apps.enrollments.tasks import send_enrollment_rejected_email_task
            try:
                send_enrollment_rejected_email_task.delay(str(pre_enrollment.id))
            except Exception:
                from apps.enrollments.email_service import send_enrollment_rejected_email
                send_enrollment_rejected_email(pre_enrollment)

        serializer = PreEnrollmentDetailSerializer(pre_enrollment)
        return Response({
            'message': f"Aspirante {'aceptado' if decision == 'accepted' else 'rechazado'} correctamente",
            'pre_enrollment': serializer.data,
        })

    @action(
        detail=True,
        methods=['post'],
        url_path='upload-document',
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_document(self, request, pk=None):
        """
        Subir documento a una pre-inscripción

        POST /api/pre-enrollments/pre-enrollments/{id}/upload-document/
        Body (multipart): document_type, file
        """
        pre_enrollment = self.get_object()

        # Los aspirantes solo pueden subir documentos a su propia solicitud
        if request.user.role == 'aspirante':
            if (not hasattr(request.user, 'student_profile') or
                    pre_enrollment.student != request.user.student_profile):
                return Response(
                    {'error': 'No tiene permiso para subir documentos a esta solicitud'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = DocumentUploadSerializer(
            data=request.data,
            context={'request': request, 'pre_enrollment': pre_enrollment}
        )
        serializer.is_valid(raise_exception=True)

        document_type = serializer.validated_data['document_type']
        uploaded_file = request.FILES.get('file')
        mime_type = uploaded_file.content_type if uploaded_file else None

        # Verificar si ya existe un documento del mismo tipo
        existing = pre_enrollment.documents.filter(document_type=document_type).first()

        # Permitir siempre la re-subida si el documento existente está rechazado.
        # Para documentos nuevos (sin existente rechazado), exigir estado válido de la solicitud.
        is_reupload_of_rejected = existing and existing.status == 'rejected'
        if not is_reupload_of_rejected and pre_enrollment.status not in ['draft', 'documents_rejected']:
            return Response(
                {'error': 'No se pueden subir documentos en el estado actual de la solicitud'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if existing:
            if existing.status in ['pending', 'approved']:
                return Response(
                    {'error': 'Este tipo de documento ya fue subido. Solo puedes reemplazar documentos rechazados.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Reemplazar documento rechazado: actualizar archivo y resetear estado a pending
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
            document = serializer.save(pre_enrollment=pre_enrollment)
            if document.file_path:
                document.file_name = document.file_path.name
                document.file_size = document.file_path.size
                document.mime_type = mime_type
                document.save()

        return Response(
            DocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='my-applications')
    def my_applications(self, request):
        """
        Obtener pre-inscripciones del estudiante autenticado.

        GET /api/pre-enrollments/pre-enrollments/my-applications/
        """
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'No tiene perfil de estudiante'},
                status=status.HTTP_404_NOT_FOUND
            )

        student = request.user.student_profile
        applications = PreEnrollment.objects.select_related(
            'program', 'period'
        ).filter(student=student).order_by('-created_at')

        page = self.paginate_queryset(applications)
        if page is not None:
            serializer = PreEnrollmentDetailSerializer(
                page, many=True, context={'request': request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = PreEnrollmentDetailSerializer(
            applications, many=True, context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Obtener estadísticas de pre-inscripciones
        
        GET /api/pre-enrollments/stats/
        """
        queryset = self.get_queryset()
        
        total = queryset.count()
        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        
        by_program = dict(
            queryset.values('program__name')
            .annotate(count=Count('id'))
            .values_list('program__name', 'count')
        )
        
        by_period = dict(
            queryset.values('period__name')
            .annotate(count=Count('id'))
            .values_list('period__name', 'count')
        )
        
        avg_score = queryset.filter(
            exam_score__isnull=False
        ).aggregate(avg=Avg('exam_score'))['avg']
        
        completed = queryset.filter(status='exam_completed').count()
        accepted = queryset.filter(status='accepted').count()
        acceptance_rate = (accepted / completed * 100) if completed > 0 else None
        
        stats = {
            'total': total,
            'by_status': by_status,
            'by_program': by_program,
            'by_period': by_period,
            'average_exam_score': avg_score,
            'acceptance_rate': acceptance_rate,
        }
        
        serializer = PreEnrollmentStatsSerializer(stats)
        return Response(serializer.data)

class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar documentos de pre-inscripción
    """
    
    queryset = Document.objects.select_related(
        'pre_enrollment',
        'pre_enrollment__student',
        'reviewed_by'
    ).all()
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = DocumentFilter
    search_fields = [
        'pre_enrollment__student__first_name',
        'pre_enrollment__student__last_name',
        'document_type',
    ]
    ordering_fields = ['uploaded_at', 'document_type', 'status']
    ordering = ['-uploaded_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentSerializer
    
    def get_permissions(self):
        """Permisos específicos por acción"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrStaff()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Guardar información adicional del archivo"""
        document = serializer.save()
        
        # Guardar información del archivo
        if document.file_path:
            document.file_name = document.file_path.name
            document.file_size = document.file_path.size
            document.mime_type = document.file_path.content_type
            document.save()
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        parser_classes=[JSONParser],
        url_path='review'
    )
    def review(self, request, pk=None):
        """
        Aprobar o rechazar documento

        POST /api/documents/{id}/review/
        Body: {
            "action": "approve" | "reject",
            "reviewer_notes": "comentarios"
        }
        """
        document = self.get_object()
        serializer = DocumentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        
        if action_type == 'approve':
            document.status = 'approved'
        else:
            document.status = 'rejected'
        
        reviewer_notes = serializer.validated_data.get('reviewer_notes', '')
        document.reviewer_notes = reviewer_notes
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save()

        # Notificar al aspirante por correo (asíncrono con fallback síncrono)
        from .tasks import send_document_review_email_task
        try:
            send_document_review_email_task.delay(
                str(document.id), action_type, reviewer_notes
            )
        except Exception:
            from .email_service import send_document_review_email
            send_document_review_email(document, action_type, reviewer_notes)

        # Actualizar automáticamente el estado de la pre-inscripción según documentos
        pre_enrollment = document.pre_enrollment
        if pre_enrollment.status in ['submitted', 'under_review', 'documents_rejected']:
            all_doc_statuses = list(
                Document.objects.filter(pre_enrollment=pre_enrollment)
                .values_list('status', flat=True)
            )
            if all_doc_statuses and all(s == 'approved' for s in all_doc_statuses):
                pre_enrollment.status = 'payment_pending'
                pre_enrollment.reviewed_at = timezone.now()
                pre_enrollment.reviewed_by = request.user
                pre_enrollment.save()
                from .tasks import send_all_documents_approved_email_task
                try:
                    send_all_documents_approved_email_task.delay(str(pre_enrollment.id))
                except Exception:
                    from .email_service import send_all_documents_approved_email
                    send_all_documents_approved_email(pre_enrollment)
            elif any(s == 'rejected' for s in all_doc_statuses):
                if pre_enrollment.status != 'documents_rejected':
                    pre_enrollment.status = 'documents_rejected'
                    pre_enrollment.reviewed_at = timezone.now()
                    pre_enrollment.reviewed_by = request.user
                    pre_enrollment.save()
            elif pre_enrollment.status == 'submitted':
                pre_enrollment.status = 'under_review'
                pre_enrollment.reviewed_at = timezone.now()
                pre_enrollment.reviewed_by = request.user
                pre_enrollment.save()

        response_serializer = DocumentSerializer(document)
        return Response({
            'message': f'Documento {action_type}d correctamente',
            'document': response_serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='pending-review')
    def pending_review(self, request):
        """
        Listar documentos pendientes de revisión
        
        GET /api/documents/pending-review/
        """
        documents = self.get_queryset().filter(status='pending')
        
        page = self.paginate_queryset(documents)
        if page is not None:
            serializer = DocumentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(
        detail=False,
        methods=['get'],
        url_path='my-documents/(?P<pre_enrollment_id>[^/.]+)'
    )
    def my_documents(self, request, pre_enrollment_id=None):
        """
        Obtener documentos de una pre-inscripción del usuario
        
        GET /api/documents/my-documents/{pre_enrollment_id}/
        """
        try:
            student = request.user.student_profile
            documents = self.get_queryset().filter(
                pre_enrollment__id=pre_enrollment_id,
                pre_enrollment__student=student
            )
            
            serializer = DocumentSerializer(
                documents,
                many=True,
                context={'request': request}
            )
            return Response(serializer.data)
        except:
            return Response(
                {'error': 'No tiene acceso a estos documentos'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Obtener estadísticas de documentos
        
        GET /api/documents/stats/
        """
        queryset = self.get_queryset()
        
        total = queryset.count()
        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        by_type = dict(
            queryset.values('document_type')
            .annotate(count=Count('id'))
            .values_list('document_type', 'count')
        )
        
        stats = {
            'total_documents': total,
            'by_status': by_status,
            'by_type': by_type,
        }
        
        return Response(stats)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar convocatorias
    """
    
    queryset = Announcement.objects.select_related('period').all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    search_fields = ['title', 'description']
    ordering_fields = ['published_at', 'deadline', 'created_at']
    ordering = ['-published_at']
    
    def get_permissions(self):
        """Solo admin y servicios escolares pueden modificar"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """
        Listar convocatorias activas
        
        GET /api/announcements/active/
        """
        announcements = self.get_queryset().filter(
            is_active=True,
            published_at__isnull=False
        )
        
        page = self.paginate_queryset(announcements)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(announcements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='open')
    def open(self, request):
        """
        Listar convocatorias abiertas (antes del deadline)
        
        GET /api/announcements/open/
        """
        today = timezone.now().date()
        announcements = self.get_queryset().filter(
            is_active=True,
            published_at__isnull=False,
            deadline__gte=today
        )
        
        serializer = self.get_serializer(announcements, many=True)
        return Response(serializer.data)
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='publish'
    )
    def publish(self, request, pk=None):
        """
        Publicar convocatoria
        
        POST /api/announcements/{id}/publish/
        """
        announcement = self.get_object()
        
        if announcement.published_at:
            return Response(
                {'error': 'La convocatoria ya está publicada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        announcement.published_at = timezone.now()
        announcement.is_active = True
        announcement.save()
        
        serializer = self.get_serializer(announcement)
        return Response({
            'message': 'Convocatoria publicada correctamente',
            'announcement': serializer.data
        })