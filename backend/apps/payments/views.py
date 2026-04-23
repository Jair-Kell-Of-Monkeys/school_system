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
        elif user.role in ('aspirante', 'alumno'):
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
        """Genera PDF de recibo oficial con diseño institucional y código QR."""
        import io as _io
        import qrcode
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, Image,
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        BRAND      = colors.HexColor('#1a56db')
        TEXT_MUTED = colors.HexColor('#6b7280')
        ROW_ALT    = colors.HexColor('#f0f5ff')
        HIGHLIGHT  = colors.HexColor('#dbeafe')

        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            topMargin=1.5 * cm, bottomMargin=2 * cm,
            leftMargin=2 * cm, rightMargin=2 * cm,
        )
        styles = getSampleStyleSheet()
        W = doc.width  # ~17 cm

        h_title = ParagraphStyle(
            'RTitle', parent=styles['Normal'],
            alignment=TA_CENTER, fontSize=17,
            fontName='Helvetica-Bold', textColor=colors.white,
        )
        h_sub = ParagraphStyle(
            'RSub', parent=styles['Normal'],
            alignment=TA_CENTER, fontSize=10,
            fontName='Helvetica', textColor=colors.HexColor('#c7d9f8'),
        )
        footer_p = ParagraphStyle(
            'RFooterP', parent=styles['Normal'],
            fontSize=8, textColor=TEXT_MUTED,
            alignment=TA_CENTER, leading=11,
        )
        qr_caption = ParagraphStyle(
            'RQRCap', parent=styles['Normal'],
            fontSize=7, textColor=TEXT_MUTED,
            alignment=TA_CENTER, leading=10,
        )

        story = []

        # ── Encabezado con fondo azul institucional ───────────────────────
        header = Table(
            [
                [Paragraph('SISTEMA UNIVERSITARIO', h_title)],
                [Paragraph('RECIBO OFICIAL DE PAGO', h_sub)],
            ],
            colWidths=[W],
        )
        header.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), BRAND),
            ('TOPPADDING',    (0, 0), (0, 0),   14),
            ('BOTTOMPADDING', (0, 0), (0, 0),    3),
            ('TOPPADDING',    (0, 1), (0, 1),    3),
            ('BOTTOMPADDING', (0, 1), (0, 1),   13),
            ('LEFTPADDING',   (0, 0), (-1, -1),  0),
            ('RIGHTPADDING',  (0, 0), (-1, -1),  0),
        ]))
        story.append(header)
        story.append(Spacer(1, 0.6 * cm))

        # ── Datos del pago ────────────────────────────────────────────────
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

        # row 0 = Folio (HIGHLIGHT), row 5 = Monto (HIGHLIGHT)
        rows = [
            ['Folio',               payment.reference_number],
            ['Nombre',              student.get_full_name()],
            ['CURP',                student.curp],
            ['Programa',            program.name],
            ['Concepto',            payment.get_payment_type_display()],
            ['Monto',               f'${float(payment.amount):,.2f} MXN'],
            ['Fecha de pago',       payment_date_str],
            ['Validado por',        validated_by_str],
            ['Fecha de validación', validated_at_str],
        ]

        info_table = Table(rows, colWidths=[4.5 * cm, 8.5 * cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME',       (0, 0), (0, -1),  'Helvetica-Bold'),
            ('FONTNAME',       (1, 0), (1, -1),  'Helvetica'),
            ('FONTSIZE',       (0, 0), (-1, -1), 10),
            ('TEXTCOLOR',      (0, 0), (0, -1),  TEXT_MUTED),
            ('TEXTCOLOR',      (1, 0), (1, -1),  colors.HexColor('#111827')),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, ROW_ALT]),
            # Resaltar Folio (fila 0) y Monto (fila 5)
            ('BACKGROUND',     (0, 0), (-1, 0),  HIGHLIGHT),
            ('BACKGROUND',     (0, 5), (-1, 5),  HIGHLIGHT),
            ('FONTNAME',       (1, 0), (1, 0),   'Helvetica-Bold'),
            ('FONTNAME',       (1, 5), (1, 5),   'Helvetica-Bold'),
            ('FONTSIZE',       (0, 0), (-1, 0),  11),
            ('FONTSIZE',       (0, 5), (-1, 5),  11),
            ('TEXTCOLOR',      (1, 0), (1, 0),   BRAND),
            ('TEXTCOLOR',      (1, 5), (1, 5),   BRAND),
            ('GRID',           (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('TOPPADDING',     (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING',  (0, 0), (-1, -1), 7),
            ('LEFTPADDING',    (0, 0), (-1, -1), 10),
            ('RIGHTPADDING',   (0, 0), (-1, -1), 10),
        ]))

        # ── Código QR de verificación ─────────────────────────────────────
        qr_url = (
            f"https://schoolsystem-production-8c10.up.railway.app"
            f"/api/verify/payment/{payment.id}/"
        )
        qr_obj = qrcode.QRCode(version=1, box_size=5, border=2)
        qr_obj.add_data(qr_url)
        qr_obj.make(fit=True)
        qr_pil = qr_obj.make_image(fill_color='black', back_color='white')
        qr_buf = _io.BytesIO()
        qr_pil.save(qr_buf, format='PNG')
        qr_buf.seek(0)
        qr_img = Image(qr_buf, width=3.5 * cm, height=3.5 * cm)

        qr_block = Table(
            [
                [qr_img],
                [Paragraph('Verificar recibo:', qr_caption)],
                [Paragraph('escanee el código QR', qr_caption)],
            ],
            colWidths=[3.8 * cm],
        )
        qr_block.setStyle(TableStyle([
            ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING',   (0, 0), (-1, -1), 0),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ]))

        # Layout en dos columnas: datos del pago | QR
        main_layout = Table(
            [[info_table, qr_block]],
            colWidths=[13 * cm, 4 * cm],
        )
        main_layout.setStyle(TableStyle([
            ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
            ('ALIGN',        (1, 0), (1, 0),   'CENTER'),
            ('LEFTPADDING',  (0, 0), (0, 0),    0),
            ('RIGHTPADDING', (0, 0), (0, 0),    0),
            ('LEFTPADDING',  (1, 0), (1, 0),    8),
            ('RIGHTPADDING', (1, 0), (1, 0),    0),
        ]))
        story.append(main_layout)
        story.append(Spacer(1, 0.8 * cm))

        # ── Pie de página ─────────────────────────────────────────────────
        story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(
            'Este recibo acredita el pago realizado y registrado en el Sistema Universitario. '
            'Para cualquier aclaración, acuda a la oficina de Finanzas con identificación oficial vigente. '
            'Puede verificar la autenticidad de este documento escaneando el código QR.',
            footer_p,
        ))

        # ── Marca de agua diagonal ────────────────────────────────────────
        from reportlab.lib.pagesizes import A4 as _A4

        def draw_watermark(canvas_obj, _doc_obj):
            page_w, page_h = _A4
            canvas_obj.saveState()
            canvas_obj.setFont('Helvetica-Bold', 52)
            canvas_obj.setFillColorRGB(0.76, 0.86, 0.98)
            canvas_obj.translate(page_w / 2, page_h / 2)
            canvas_obj.rotate(45)
            canvas_obj.drawCentredString(0, 0, 'DOCUMENTO OFICIAL')
            canvas_obj.restoreState()

        doc.build(story, onFirstPage=draw_watermark, onLaterPages=draw_watermark)


# ── Public payment verification endpoint (no auth required) ──────────────────

def verify_payment_public(request, payment_id):
    """
    GET /api/verify/payment/<payment_id>/
    Página HTML pública para verificar la autenticidad de un recibo de pago.
    """
    try:
        payment = (
            Payment.objects
            .select_related(
                'pre_enrollment',
                'pre_enrollment__student',
                'pre_enrollment__program',
                'validated_by',
            )
            .get(pk=payment_id, status='validated')
        )
        found = True
    except (Payment.DoesNotExist, Exception):
        found = False
        payment = None

    if found:
        student = payment.pre_enrollment.student
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
        amount_str = f'${float(payment.amount):,.2f} MXN'

        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Recibo — Sistema Universitario</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f5ff;
      color: #111827;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }}
    .card {{
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(26, 86, 219, 0.10);
      max-width: 560px;
      width: 100%;
      overflow: hidden;
    }}
    .header {{
      background: #1a56db;
      padding: 2rem;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{ font-size: 1.15rem; font-weight: 700; letter-spacing: 0.05em; opacity: 0.95; }}
    .header p {{ font-size: 0.875rem; opacity: 0.75; margin-top: 0.25rem; }}
    .badge-valid {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #d1fae5;
      color: #065f46;
      border: 1.5px solid #6ee7b7;
      border-radius: 9999px;
      padding: 0.4rem 1.1rem;
      font-size: 0.875rem;
      font-weight: 700;
      margin-top: 1rem;
    }}
    .badge-valid svg {{ flex-shrink: 0; }}
    .body {{ padding: 1.75rem 2rem; }}
    .field {{
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 0.65rem 0;
      border-bottom: 1px solid #e5e7eb;
      gap: 1rem;
    }}
    .field:last-child {{ border-bottom: none; }}
    .field-label {{
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }}
    .field-value {{
      font-size: 0.9rem;
      font-weight: 600;
      color: #111827;
      text-align: right;
    }}
    .field-value.highlight {{
      color: #1a56db;
      font-size: 1rem;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.08em;
    }}
    .footer {{
      background: #f0f5ff;
      border-top: 1px solid #dbeafe;
      padding: 1rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SISTEMA UNIVERSITARIO</h1>
      <p>Verificación de Recibo Oficial de Pago</p>
      <div class="badge-valid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Recibo Válido
      </div>
    </div>
    <div class="body">
      <div class="field">
        <span class="field-label">Folio</span>
        <span class="field-value highlight">{payment.reference_number}</span>
      </div>
      <div class="field">
        <span class="field-label">Nombre</span>
        <span class="field-value">{student.get_full_name()}</span>
      </div>
      <div class="field">
        <span class="field-label">Concepto</span>
        <span class="field-value">{payment.get_payment_type_display()}</span>
      </div>
      <div class="field">
        <span class="field-label">Monto</span>
        <span class="field-value highlight">{amount_str}</span>
      </div>
      <div class="field">
        <span class="field-label">Fecha de pago</span>
        <span class="field-value">{payment_date_str}</span>
      </div>
      <div class="field">
        <span class="field-label">Validado por</span>
        <span class="field-value">{validated_by_str}</span>
      </div>
      <div class="field">
        <span class="field-label">Fecha de validación</span>
        <span class="field-value">{validated_at_str}</span>
      </div>
    </div>
    <div class="footer">
      Este recibo ha sido verificado contra los registros oficiales del Sistema Universitario.
    </div>
  </div>
</body>
</html>"""
    else:
        html = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Recibo — Sistema Universitario</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f5ff;
      color: #111827;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(26, 86, 219, 0.10);
      max-width: 480px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: #1a56db;
      padding: 2rem;
      text-align: center;
      color: #ffffff;
    }
    .header h1 { font-size: 1.15rem; font-weight: 700; letter-spacing: 0.05em; opacity: 0.95; }
    .header p { font-size: 0.875rem; opacity: 0.75; margin-top: 0.25rem; }
    .badge-invalid {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #fee2e2;
      color: #991b1b;
      border: 1.5px solid #fca5a5;
      border-radius: 9999px;
      padding: 0.4rem 1.1rem;
      font-size: 0.875rem;
      font-weight: 700;
      margin-top: 1rem;
    }
    .body { padding: 1.75rem 2rem; text-align: center; color: #6b7280; font-size: 0.9rem; }
    .footer {
      background: #f0f5ff;
      border-top: 1px solid #dbeafe;
      padding: 1rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SISTEMA UNIVERSITARIO</h1>
      <p>Verificación de Recibo Oficial de Pago</p>
      <div class="badge-invalid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Recibo No Válido o No Encontrado
      </div>
    </div>
    <div class="body">
      <p>No se encontró un recibo válido con este identificador.</p>
      <p style="margin-top:0.5rem;">El documento puede ser inválido, el pago no ha sido validado aún, o el código QR puede estar dañado.</p>
    </div>
    <div class="footer">
      Si crees que esto es un error, acude a la oficina de Finanzas con tu recibo físico.
    </div>
  </div>
</body>
</html>"""

    return HttpResponse(html, content_type='text/html; charset=utf-8')
