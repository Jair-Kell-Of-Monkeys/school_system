# apps/payments/views.py
import io
import logging
from datetime import timedelta, datetime

from django.http import HttpResponse
from django.db.models import Sum, Count
from django.utils import timezone

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Payment
from .serializers import (
    PaymentListSerializer,
    PaymentDetailSerializer,
    PaymentCreateSerializer,
    PaymentUploadReceiptSerializer,
    PaymentValidateSerializer,
    PaymentRejectSerializer,
)
from .filters import PaymentFilter
from .permissions import IsFinanzasOrAdmin, IsOwnerOrFinanzas

logger = logging.getLogger(__name__)

STAFF_ROLES = ['admin', 'servicios_escolares_jefe', 'servicios_escolares', 'finanzas']


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar pagos."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PaymentFilter
    search_fields = [
        'pre_enrollment__student__first_name',
        'pre_enrollment__student__last_name',
        'pre_enrollment__student__curp',
        'reference_number',
    ]
    ordering_fields = ['created_at', 'amount', 'status', 'payment_type']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        elif self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related(
            'pre_enrollment',
            'pre_enrollment__student',
            'pre_enrollment__student__user',
            'pre_enrollment__program',
            'validated_by',
        ).all()

        if user.role in ['admin', 'finanzas', 'servicios_escolares_jefe']:
            return qs
        elif user.role == 'servicios_escolares':
            programs = user.get_accessible_programs()
            return qs.filter(pre_enrollment__program__in=programs)
        elif user.role == 'aspirante':
            return qs.filter(pre_enrollment__student__user=user)
        return Payment.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return Response(
            PaymentDetailSerializer(payment, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=['post'],
        url_path='upload-receipt',
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsOwnerOrFinanzas],
    )
    def upload_receipt(self, request, pk=None):
        """
        Sube el comprobante de pago.
        POST /api/pre-enrollments/payments/{id}/upload-receipt/
        """
        payment = self.get_object()

        if payment.status not in ('pending', 'rejected'):
            return Response(
                {'error': 'El pago ya fue procesado'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PaymentUploadReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        was_rejected = payment.status == 'rejected'

        payment.receipt_file = serializer.validated_data['receipt_file']
        # Convert date → datetime for the DateTimeField (db column: paid_at)
        d = serializer.validated_data['payment_date']
        payment.payment_date = datetime(d.year, d.month, d.day)
        if was_rejected:
            # Limpiar datos de la validación anterior al re-subir
            payment.status = 'pending'
            payment.validated_by = None
            payment.validated_at = None
            payment.validation_notes = ''
        payment.save()

        # Actualizar estado de pre-enrollment
        pre_enrollment = payment.pre_enrollment
        if pre_enrollment.status in ('payment_pending', 'payment_submitted'):
            pre_enrollment.status = 'payment_submitted'
            pre_enrollment.save()

        return Response(
            PaymentDetailSerializer(payment, context={'request': request}).data
        )

    @action(
        detail=True,
        methods=['post'],
        url_path='validate',
        parser_classes=[JSONParser],
        permission_classes=[IsFinanzasOrAdmin],
    )
    def validate(self, request, pk=None):
        """
        Valida el pago.
        POST /api/pre-enrollments/payments/{id}/validate/
        """
        payment = self.get_object()

        if payment.status != 'pending':
            return Response(
                {'error': 'Solo se pueden validar pagos pendientes'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PaymentValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment.status = 'validated'
        payment.validated_by = request.user
        payment.validated_at = timezone.now()
        payment.validation_notes = serializer.validated_data.get('notes', '')
        payment.save()

        # Actualizar estado de pre-enrollment o enrollment según tipo de pago
        pre_enrollment = payment.pre_enrollment
        if payment.payment_type == 'inscripcion':
            # Si es pago de inscripción, actualizar el enrollment asociado
            try:
                from apps.enrollments.models import Enrollment
                enrollment = Enrollment.objects.get(pre_enrollment=pre_enrollment)
                enrollment.status = 'enrolled'
                enrollment.save()
                logger.info(
                    '[PaymentViewSet.validate] Enrollment %s marcado como enrolled',
                    enrollment.id,
                )
                student_user = enrollment.student.user
                if student_user.role == 'aspirante':
                    student_user.role = 'alumno'
                    student_user.save(update_fields=['role', 'updated_at'])
                    logger.info(
                        '[PaymentViewSet.validate] Rol cambiado a alumno: user=%s',
                        student_user.pk,
                    )
                from apps.enrollments.tasks import send_enrollment_completed_email_task
                try:
                    send_enrollment_completed_email_task.delay(str(enrollment.id))
                except Exception:
                    from apps.enrollments.email_service import send_enrollment_completed_email
                    send_enrollment_completed_email(enrollment)
            except Exception as exc:
                logger.error(
                    '[PaymentViewSet.validate] Error actualizando enrollment: %s', exc
                )
        else:
            # Pago de examen: actualizar estado de pre-enrollment
            if pre_enrollment.status == 'payment_submitted':
                pre_enrollment.status = 'payment_validated'
                pre_enrollment.save()

        return Response(
            PaymentDetailSerializer(payment, context={'request': request}).data
        )

    @action(
        detail=True,
        methods=['post'],
        url_path='reject',
        parser_classes=[JSONParser],
        permission_classes=[IsFinanzasOrAdmin],
    )
    def reject(self, request, pk=None):
        """
        Rechaza el pago.
        POST /api/pre-enrollments/payments/{id}/reject/
        """
        payment = self.get_object()

        if payment.status != 'pending':
            return Response(
                {'error': 'Solo se pueden rechazar pagos pendientes'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PaymentRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment.status = 'rejected'
        payment.validated_by = request.user
        payment.validated_at = timezone.now()
        payment.validation_notes = serializer.validated_data['notes']
        payment.save()

        # Volver pre-enrollment a payment_pending para que pueda reintentar
        pre_enrollment = payment.pre_enrollment
        if pre_enrollment.status == 'payment_submitted':
            pre_enrollment.status = 'payment_pending'
            pre_enrollment.save()

        # Notificar al aspirante por correo (asíncrono con fallback síncrono)
        from .tasks import send_payment_rejected_email_task
        try:
            send_payment_rejected_email_task.delay(str(payment.id))
        except Exception:
            from .email_service import send_payment_rejected_email
            send_payment_rejected_email(payment)

        return Response(
            PaymentDetailSerializer(payment, context={'request': request}).data
        )

    @action(
        detail=False,
        methods=['get'],
        url_path='stats',
        permission_classes=[IsFinanzasOrAdmin],
    )
    def stats(self, request):
        """
        Métricas de pagos.
        GET /api/pre-enrollments/payments/stats/
        """
        qs = self.get_queryset()

        total = qs.count()
        pending = qs.filter(status='pending').count()
        validated = qs.filter(status='validated').count()
        rejected = qs.filter(status='rejected').count()

        total_amount = qs.filter(status='validated').aggregate(
            s=Sum('amount')
        )['s'] or 0

        pending_amount = qs.filter(status='pending').aggregate(
            s=Sum('amount')
        )['s'] or 0

        by_payment_type = dict(
            qs.values('payment_type')
            .annotate(count=Count('id'))
            .values_list('payment_type', 'count')
        )

        return Response({
            'total': total,
            'pending': pending,
            'validated': validated,
            'rejected': rejected,
            'total_amount': str(total_amount),
            'pending_amount': str(pending_amount),
            'by_payment_type': by_payment_type,
        })

    @action(
        detail=True,
        methods=['get'],
        url_path='download-slip',
        permission_classes=[IsOwnerOrFinanzas],
    )
    def download_slip(self, request, pk=None):
        """
        Descarga ficha de pago (PDF).
        GET /api/pre-enrollments/payments/{id}/download-slip/
        """
        payment = self.get_object()
        buffer = io.BytesIO()
        self._generate_slip_pdf(buffer, payment)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="ficha-pago-{payment.reference_number}.pdf"'
        )
        return response

    @action(
        detail=True,
        methods=['get'],
        url_path='download-receipt',
        permission_classes=[IsOwnerOrFinanzas],
    )
    def download_receipt(self, request, pk=None):
        """
        Descarga recibo oficial (PDF, solo si validado).
        GET /api/pre-enrollments/payments/{id}/download-receipt/
        """
        payment = self.get_object()

        if payment.status != 'validated':
            return Response(
                {'error': 'El recibo solo está disponible para pagos validados'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buffer = io.BytesIO()
        self._generate_receipt_pdf(buffer, payment)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="recibo-{payment.reference_number}.pdf"'
        )
        return response

    # -------------------------------------------------------------------------
    # PDF helpers
    # -------------------------------------------------------------------------

    def _generate_slip_pdf(self, buffer, payment):
        """Genera PDF de ficha de pago."""
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            alignment=TA_CENTER,
            fontSize=16,
        )
        ref_style = ParagraphStyle(
            'RefNumber',
            parent=styles['Heading1'],
            alignment=TA_CENTER,
            fontSize=24,
            textColor=colors.HexColor('#1a56db'),
        )

        story.append(Paragraph('SISTEMA UNIVERSITARIO', title_style))
        story.append(Paragraph('FICHA DE PAGO', title_style))
        story.append(Spacer(1, 0.5 * cm))

        story.append(Paragraph('NÚMERO DE REFERENCIA', styles['Heading3']))
        story.append(Paragraph(payment.reference_number, ref_style))
        story.append(Spacer(1, 0.5 * cm))

        student = payment.pre_enrollment.student
        program = payment.pre_enrollment.program
        vence = payment.created_at.date() + timedelta(days=30)

        data = [
            ['Aspirante:', student.get_full_name()],
            ['CURP:', student.curp],
            ['Programa:', program.name],
            ['Concepto:', payment.get_payment_type_display()],
            ['Monto:', f'${float(payment.amount):,.2f} MXN'],
            ['Fecha de emisión:', payment.created_at.date().strftime('%d/%m/%Y')],
            ['Vigencia:', vence.strftime('%d/%m/%Y')],
        ]

        table = Table(data, colWidths=[5 * cm, 12 * cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.whitesmoke, colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 1 * cm))

        story.append(Paragraph('INSTRUCCIONES DE PAGO', styles['Heading3']))
        instrucciones = [
            '1. Realice su depósito o transferencia usando el número de referencia indicado.',
            '2. Conserve su comprobante de pago original.',
            '3. Suba el comprobante al portal dentro del plazo de vigencia.',
            '4. Su pago será validado en un plazo de 24-48 horas hábiles.',
            'CLABE interbancaria: 000 000 000 000 000 000',
            'Banco: Banco Universitario',
        ]
        for line in instrucciones:
            story.append(Paragraph(line, styles['Normal']))

        doc.build(story)

    def _generate_receipt_pdf(self, buffer, payment):
        """Genera PDF de recibo oficial."""
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            alignment=TA_CENTER,
            fontSize=16,
        )

        story.append(Paragraph('SISTEMA UNIVERSITARIO', title_style))
        story.append(Paragraph('RECIBO OFICIAL DE PAGO', title_style))
        story.append(Spacer(1, 0.5 * cm))

        student = payment.pre_enrollment.student
        program = payment.pre_enrollment.program

        payment_date_str = (
            payment.payment_date.strftime('%d/%m/%Y')
            if payment.payment_date else 'N/A'
        )
        validated_at_str = (
            payment.validated_at.strftime('%d/%m/%Y')
            if payment.validated_at else 'N/A'
        )
        validated_by_str = (
            payment.validated_by.email if payment.validated_by else 'Sistema'
        )

        data = [
            ['Folio:', payment.reference_number],
            ['Aspirante:', student.get_full_name()],
            ['CURP:', student.curp],
            ['Programa:', program.name],
            ['Concepto:', payment.get_payment_type_display()],
            ['Monto:', f'${float(payment.amount):,.2f} MXN'],
            ['Fecha de pago:', payment_date_str],
            ['Validado por:', validated_by_str],
            ['Fecha de validación:', validated_at_str],
        ]

        table = Table(data, colWidths=[5 * cm, 12 * cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.whitesmoke, colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 1 * cm))

        story.append(Paragraph(
            'Este recibo acredita el pago realizado y registrado en el sistema universitario.',
            styles['Normal'],
        ))

        doc.build(story)
