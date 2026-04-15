# apps/credentials/views.py
import io
import logging

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import CredentialConvocatoria, CredentialRequest, Credential
from .serializers import (
    CredentialConvocatoriaListSerializer,
    CredentialConvocatoriaCreateSerializer,
    CredentialRequestListSerializer,
    CredentialRequestCreateSerializer,
    CredentialRequestRejectSerializer,
    CredentialSerializer,
)
from apps.enrollments.models import Enrollment
from apps.pre_enrollment.permissions import IsAdminOrServiciosEscolares

logger = logging.getLogger(__name__)

STAFF_ROLES = ['admin', 'servicios_escolares_jefe', 'servicios_escolares']
JEFE_ROLES = ['admin', 'servicios_escolares_jefe']


# ─── Convocatoria ViewSet ────────────────────────────────────────────────────

class CredentialConvocatoriaViewSet(viewsets.ModelViewSet):
    """
    GET    /api/credentials/convocatorias/           - lista (activas para alumnos, todas para staff)
    POST   /api/credentials/convocatorias/           - crear (solo jefe)
    GET    /api/credentials/convocatorias/{id}/      - detalle
    POST   /api/credentials/convocatorias/{id}/publish/ - publicar (solo jefe)
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'period']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CredentialConvocatoriaCreateSerializer
        return CredentialConvocatoriaListSerializer

    def get_queryset(self):
        qs = CredentialConvocatoria.objects.select_related('period', 'created_by')
        user = self.request.user
        if user.role not in STAFF_ROLES:
            qs = qs.filter(status='activa')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'publish']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        if request.user.role not in JEFE_ROLES:
            return Response(
                {'error': 'Solo el jefe de servicios escolares o admin puede crear convocatorias.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = CredentialConvocatoriaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        convocatoria = serializer.save(created_by=request.user, status='borrador')
        return Response(
            CredentialConvocatoriaListSerializer(convocatoria, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrServiciosEscolares])
    def close(self, request, pk=None):
        """POST /api/credentials/convocatorias/{id}/close/"""
        if request.user.role not in JEFE_ROLES:
            return Response(
                {'error': 'Solo el jefe de servicios escolares o admin puede cerrar convocatorias.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        convocatoria = self.get_object()
        if convocatoria.status == 'cerrada':
            return Response(
                {'error': 'La convocatoria ya está cerrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        convocatoria.status = 'cerrada'
        convocatoria.save(update_fields=['status', 'updated_at'])
        return Response(
            CredentialConvocatoriaListSerializer(convocatoria, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrServiciosEscolares])
    def publish(self, request, pk=None):
        """POST /api/credentials/convocatorias/{id}/publish/"""
        if request.user.role not in JEFE_ROLES:
            return Response(
                {'error': 'Solo el jefe de servicios escolares o admin puede publicar convocatorias.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        convocatoria = self.get_object()
        if convocatoria.status == 'activa':
            return Response(
                {'error': 'La convocatoria ya está activa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if convocatoria.status == 'cerrada':
            return Response(
                {'error': 'Una convocatoria cerrada no puede reactivarse.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        convocatoria.status = 'activa'
        convocatoria.save(update_fields=['status', 'updated_at'])
        return Response(
            CredentialConvocatoriaListSerializer(convocatoria, context={'request': request}).data
        )


# ─── CredentialRequest ViewSet ───────────────────────────────────────────────

class CredentialRequestViewSet(viewsets.ModelViewSet):
    """
    GET    /api/credentials/requests/                   - lista solicitudes
    POST   /api/credentials/requests/                   - crear solicitud (alumno inscrito)
    GET    /api/credentials/requests/{id}/              - detalle
    POST   /api/credentials/requests/{id}/approve/     - aprobar y generar (encargado)
    POST   /api/credentials/requests/{id}/reject/      - rechazar con motivo (encargado)
    GET    /api/credentials/requests/my-request/       - solicitud del alumno actual
    GET    /api/credentials/{id}/download/             - descargar PDF (manejado en este ViewSet)
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'convocatoria']
    search_fields = []
    ordering = ['-requested_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CredentialRequestCreateSerializer
        if self.action == 'reject':
            return CredentialRequestRejectSerializer
        return CredentialRequestListSerializer

    def get_queryset(self):
        qs = CredentialRequest.objects.select_related('convocatoria', 'reviewed_by')
        user = self.request.user

        if user.role == 'alumno':
            if hasattr(user, 'student_profile'):
                enrollment_ids = list(
                    Enrollment.objects.filter(student=user.student_profile)
                    .values_list('id', flat=True)
                )
                qs = qs.filter(enrollment_id__in=enrollment_ids)
            else:
                qs = qs.none()
        elif user.role == 'servicios_escolares':
            program_ids = list(
                user.get_accessible_programs().values_list('id', flat=True)
            )
            enrollment_ids = list(
                Enrollment.objects.filter(program_id__in=program_ids)
                .values_list('id', flat=True)
            )
            qs = qs.filter(enrollment_id__in=enrollment_ids)

        return qs

    def create(self, request, *args, **kwargs):
        """POST /api/credentials/requests/ — alumno inscrito crea solicitud."""
        if request.user.role != 'alumno':
            return Response(
                {'error': 'Solo alumnos inscritos pueden solicitar credenciales.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'No tiene perfil de estudiante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CredentialRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        convocatoria = serializer.validated_data['convocatoria']
        if convocatoria.status != 'activa':
            return Response(
                {'error': 'La convocatoria no está activa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Buscar inscripción del alumno en el periodo de la convocatoria
        enrollment = (
            Enrollment.objects.filter(
                student=request.user.student_profile,
                period=convocatoria.period,
                status='enrolled',
            ).first()
        )
        if not enrollment:
            return Response(
                {'error': 'No tienes una inscripción activa (enrolled) en el periodo de esta convocatoria.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if CredentialRequest.objects.filter(
            convocatoria=convocatoria, enrollment=enrollment
        ).exists():
            return Response(
                {'error': 'Ya tienes una solicitud para esta convocatoria.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        credential_request = CredentialRequest.objects.create(
            convocatoria=convocatoria,
            enrollment=enrollment,
            status='pendiente',
        )

        # Enviar correo de confirmación
        from .tasks import send_credential_request_received_email_task
        try:
            send_credential_request_received_email_task.delay(str(credential_request.id))
        except Exception:
            from .email_service import send_credential_request_received_email
            send_credential_request_received_email(credential_request)

        return Response(
            CredentialRequestListSerializer(credential_request, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
    )
    def approve(self, request, pk=None):
        """POST /api/credentials/requests/{id}/approve/ — encargado aprueba y genera credencial."""
        credential_request = self.get_object()

        if credential_request.status not in ('pendiente', 'rechazada'):
            return Response(
                {'error': f"No se puede aprobar una solicitud con estado '{credential_request.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generar PDF y QR
        from .generators import generate_credential_pdf, generate_qr_code_bytes
        enrollment = credential_request.enrollment

        try:
            pdf_bytes = generate_credential_pdf(credential_request)
            qr_bytes = generate_qr_code_bytes(enrollment.matricula)
        except Exception as exc:
            logger.error('[approve] Error generando credencial: %s', exc)
            return Response(
                {'error': 'Error al generar el PDF de la credencial.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Guardar o actualizar el registro Credential
        try:
            credential = Credential.objects.get(enrollment=enrollment)
        except Credential.DoesNotExist:
            credential = Credential(enrollment=enrollment)

        pdf_name = f"credencial-{enrollment.matricula}.pdf"
        qr_name = f"qr-{enrollment.matricula}.png"
        credential.pdf_file.save(pdf_name, ContentFile(pdf_bytes), save=False)
        credential.qr_code.save(qr_name, ContentFile(qr_bytes), save=False)
        credential.valid_until = enrollment.period.end_date
        credential.is_active = True
        credential.delivery_method = 'digital'
        credential.save()

        # Actualizar la solicitud
        credential_request.status = 'generada'
        credential_request.reviewed_by = request.user
        credential_request.reviewed_at = timezone.now()
        credential_request.rejection_reason = None
        credential_request.save()

        # Enviar correo
        from .tasks import send_credential_approved_email_task
        try:
            send_credential_approved_email_task.delay(str(credential_request.id))
        except Exception:
            from .email_service import send_credential_approved_email
            send_credential_approved_email(credential_request)

        return Response(
            CredentialRequestListSerializer(credential_request, context={'request': request}).data
        )

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
    )
    def reject(self, request, pk=None):
        """POST /api/credentials/requests/{id}/reject/ — encargado rechaza con motivo."""
        credential_request = self.get_object()

        if credential_request.status == 'generada':
            return Response(
                {'error': 'No se puede rechazar una solicitud ya generada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CredentialRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        credential_request.status = 'rechazada'
        credential_request.rejection_reason = serializer.validated_data['rejection_reason']
        credential_request.reviewed_by = request.user
        credential_request.reviewed_at = timezone.now()
        credential_request.save()

        from .tasks import send_credential_rejected_email_task
        try:
            send_credential_rejected_email_task.delay(str(credential_request.id))
        except Exception:
            from .email_service import send_credential_rejected_email
            send_credential_rejected_email(credential_request)

        return Response(
            CredentialRequestListSerializer(credential_request, context={'request': request}).data
        )

    @action(detail=False, methods=['get'], url_path='my-request')
    def my_request(self, request):
        """GET /api/credentials/requests/my-request/ — solicitud activa del alumno."""
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'No tiene perfil de estudiante.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        enrollment_ids = list(
            Enrollment.objects.filter(student=request.user.student_profile)
            .values_list('id', flat=True)
        )
        requests_qs = (
            CredentialRequest.objects
            .filter(enrollment_id__in=enrollment_ids)
            .select_related('convocatoria', 'reviewed_by')
            .order_by('-requested_at')
        )

        serializer = CredentialRequestListSerializer(
            requests_qs, many=True, context={'request': request}
        )
        return Response(serializer.data)


# ─── Download PDF ─────────────────────────────────────────────────────────────

class CredentialDownloadView(APIView):
    """
    GET /api/credentials/{credential_id}/download/
    Descarga el PDF de la credencial. Accesible por el dueño o staff.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, credential_id):
        try:
            credential = Credential.objects.select_related(
                'enrollment__student__user'
            ).get(pk=credential_id)
        except Credential.DoesNotExist:
            return Response({'error': 'Credencial no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role not in STAFF_ROLES:
            if (
                not hasattr(user, 'student_profile')
                or credential.enrollment.student != user.student_profile
            ):
                return Response({'error': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

        if not credential.pdf_file:
            return Response(
                {'error': 'El PDF de la credencial aún no está disponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            import urllib.request
            with urllib.request.urlopen(credential.pdf_file.url) as resp:
                pdf_bytes = resp.read()
        except Exception:
            return Response(
                {'error': 'No se pudo leer el archivo PDF.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        matricula = credential.enrollment.matricula
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="credencial-{matricula}.pdf"'
        )
        return response


# ─── Verify (público) ─────────────────────────────────────────────────────────

class CredentialVerifyView(APIView):
    """
    GET /api/credentials/verify/{matricula}/
    Verifica una credencial por matrícula. Sin autenticación.
    """
    permission_classes = [AllowAny]

    def get(self, request, matricula):
        try:
            enrollment = Enrollment.objects.select_related(
                'student', 'program', 'period'
            ).get(matricula=matricula)
        except Enrollment.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Matrícula no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            credential = Credential.objects.get(enrollment=enrollment, is_active=True)
        except Credential.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'No se encontró credencial activa para esta matrícula.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        student = enrollment.student
        return Response({
            'valid': True,
            'student_name': student.get_full_name(),
            'matricula': enrollment.matricula,
            'program': enrollment.program.name,
            'program_code': enrollment.program.code,
            'period': enrollment.period.name,
            'valid_until': credential.valid_until,
            'issued_at': credential.issued_at,
            'is_active': credential.is_active,
        })
