# apps/enrollments/views.py
import csv
import io
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

        serializer = EnrollmentDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_type = serializer.validated_data['document_type']
        uploaded_file = request.FILES.get('file')
        mime_type = uploaded_file.content_type if uploaded_file else None

        existing = enrollment.documents.filter(document_type=document_type).first()
        # Placeholder: registro sin archivo (creado automáticamente al inscribir)
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

            # Al re-subir un doc rechazado, devolver la inscripción a pending_docs
            # para que el encargado sepa que hay documentos nuevos por revisar
            if is_rejected and enrollment.status in ('docs_submitted', 'pending_docs'):
                enrollment.status = 'pending_docs'
                enrollment.save(update_fields=['status', 'updated_at'])
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
                enrollment.status = 'pending_payment'
                enrollment.save(update_fields=['status', 'updated_at'])
                logger.info(
                    '[EnrollmentViewSet.review_document] Docs aprobados, enrollment=%s → pending_payment',
                    enrollment.pk,
                )

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
    # DOWNLOAD RECEIPT (alumno inscrito)
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='download-receipt')
    def download_receipt(self, request, pk=None):
        """
        GET /api/enrollments/enrollments/{id}/download-receipt/
        Genera y descarga un PDF de comprobante de inscripción.
        Solo disponible cuando status == 'enrolled'.
        """
        enrollment = self.get_object()

        # El alumno solo puede descargar su propio comprobante
        user = request.user
        if user.role not in STAFF_ROLES:
            if not hasattr(user, 'student_profile') or enrollment.student != user.student_profile:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('No tienes permiso para descargar este comprobante.')

        if enrollment.status != 'enrolled':
            return Response(
                {'error': 'El comprobante solo está disponible para inscripciones completadas'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buffer = io.BytesIO()
        self._generate_enrollment_receipt_pdf(buffer, enrollment)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="comprobante-inscripcion-{enrollment.matricula}.pdf"'
        )
        return response

    def _generate_enrollment_receipt_pdf(self, buffer, enrollment):
        """Genera PDF de comprobante de inscripción con diseño institucional y código QR."""
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

        # ── Colores institucionales (consistentes con payments PDFs) ──────
        BRAND      = colors.HexColor('#1a56db')
        TEXT_MUTED = colors.HexColor('#6b7280')
        ROW_ALT    = colors.HexColor('#f0f5ff')

        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            topMargin=1.5 * cm, bottomMargin=2 * cm,
            leftMargin=2 * cm, rightMargin=2 * cm,
        )
        styles = getSampleStyleSheet()
        W = doc.width  # ~17 cm

        h_title = ParagraphStyle(
            'HTitle', parent=styles['Normal'],
            alignment=TA_CENTER, fontSize=17,
            fontName='Helvetica-Bold', textColor=colors.white,
        )
        h_sub = ParagraphStyle(
            'HSub', parent=styles['Normal'],
            alignment=TA_CENTER, fontSize=10,
            fontName='Helvetica', textColor=colors.HexColor('#c7d9f8'),
        )
        footer_p = ParagraphStyle(
            'FooterP', parent=styles['Normal'],
            fontSize=8, textColor=TEXT_MUTED,
            alignment=TA_CENTER, leading=11,
        )
        qr_caption = ParagraphStyle(
            'QRCap', parent=styles['Normal'],
            fontSize=7, textColor=TEXT_MUTED,
            alignment=TA_CENTER, leading=10,
        )

        story = []

        # ── Encabezado con fondo azul institucional ───────────────────────
        header = Table(
            [
                [Paragraph('SISTEMA UNIVERSITARIO', h_title)],
                [Paragraph('COMPROBANTE DE INSCRIPCIÓN', h_sub)],
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

        # ── Datos del estudiante ──────────────────────────────────────────
        student = enrollment.student
        domain = getattr(settings, 'INSTITUTIONAL_EMAIL_DOMAIN', 'universidad.edu.mx')
        institutional_email = (
            student.institutional_email or f"{enrollment.matricula}@{domain}"
        )
        enrolled_at_str = (
            enrollment.enrolled_at.strftime('%d/%m/%Y')
            if enrollment.enrolled_at else enrollment.updated_at.strftime('%d/%m/%Y')
        )

        rows = [
            ['Nombre completo',      student.get_full_name()],
            ['Matrícula',            enrollment.matricula],
            ['Correo institucional', institutional_email],
            ['Programa',             enrollment.program.name],
            ['Código de programa',   enrollment.program.code],
            ['Periodo',              enrollment.period.name],
        ]
        if enrollment.group:
            rows.append(['Grupo', enrollment.group])
        if enrollment.schedule:
            rows.append(['Horario', enrollment.schedule])
        rows.append(['Fecha de inscripción', enrolled_at_str])

        HIGHLIGHT = colors.HexColor('#dbeafe')  # blue-100

        info_table = Table(rows, colWidths=[4.5 * cm, 8.5 * cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME',       (0, 0), (0, -1),  'Helvetica-Bold'),
            ('FONTNAME',       (1, 0), (1, -1),  'Helvetica'),
            ('FONTSIZE',       (0, 0), (-1, -1), 10),
            ('TEXTCOLOR',      (0, 0), (0, -1),  TEXT_MUTED),
            ('TEXTCOLOR',      (1, 0), (1, -1),  colors.HexColor('#111827')),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, ROW_ALT]),
            # Highlight matrícula (row 1) and correo institucional (row 2)
            ('BACKGROUND',     (0, 1), (-1, 1),  HIGHLIGHT),
            ('BACKGROUND',     (0, 2), (-1, 2),  HIGHLIGHT),
            ('FONTNAME',       (1, 1), (1, 1),   'Helvetica-Bold'),
            ('FONTSIZE',       (0, 1), (-1, 1),  11),
            ('TEXTCOLOR',      (1, 1), (1, 1),   BRAND),
            ('GRID',           (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('TOPPADDING',     (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING',  (0, 0), (-1, -1), 7),
            ('LEFTPADDING',    (0, 0), (-1, -1), 10),
            ('RIGHTPADDING',   (0, 0), (-1, -1), 10),
        ]))

        # ── Código QR de verificación ─────────────────────────────────────
        qr_url = (
            f"https://schoolsystem-production-8c10.up.railway.app"
            f"/api/verify/enrollment/{enrollment.id}/"
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
                [Paragraph('Verificar comprobante:', qr_caption)],
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

        # Layout en dos columnas: datos del estudiante | QR
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
            'Este documento es un comprobante oficial de inscripción al Sistema Universitario. '
            'Para cualquier aclaración o corrección de datos, acuda a la oficina de Servicios Escolares '
            'con identificación oficial vigente. Puede verificar la autenticidad de este documento '
            'escaneando el código QR.',
            footer_p,
        ))

        # ── Marca de agua diagonal ────────────────────────────────────────
        from reportlab.lib.pagesizes import A4 as _A4

        def draw_watermark(canvas_obj, _doc_obj):
            page_w, page_h = _A4
            canvas_obj.saveState()
            canvas_obj.setFont('Helvetica-Bold', 52)
            canvas_obj.setFillColorRGB(0.76, 0.86, 0.98)  # light brand blue
            canvas_obj.translate(page_w / 2, page_h / 2)
            canvas_obj.rotate(45)
            canvas_obj.drawCentredString(0, 0, 'DOCUMENTO OFICIAL')
            canvas_obj.restoreState()

        doc.build(story, onFirstPage=draw_watermark, onLaterPages=draw_watermark)

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


# ── Public verification endpoint (no auth required) ───────────────────────────

def verify_enrollment_public(request, enrollment_id):
    """
    GET /api/verify/enrollment/<enrollment_id>/
    Página HTML pública para verificar la autenticidad de un comprobante de inscripción.
    """
    try:
        enrollment = (
            Enrollment.objects
            .select_related('student', 'student__user', 'program', 'period')
            .get(pk=enrollment_id, status='enrolled')
        )
        found = True
    except (Enrollment.DoesNotExist, Exception):
        found = False
        enrollment = None

    if found:
        enrolled_at_str = ''
        if enrollment.enrolled_at:
            enrolled_at_str = enrollment.enrolled_at.strftime('%d/%m/%Y')
        elif enrollment.updated_at:
            enrolled_at_str = enrollment.updated_at.strftime('%d/%m/%Y')

        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Inscripción — Sistema Universitario</title>
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
      <p>Verificación de Comprobante de Inscripción</p>
      <div class="badge-valid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Documento Válido
      </div>
    </div>
    <div class="body">
      <div class="field">
        <span class="field-label">Nombre completo</span>
        <span class="field-value">{enrollment.student.get_full_name()}</span>
      </div>
      <div class="field">
        <span class="field-label">Matrícula</span>
        <span class="field-value highlight">{enrollment.matricula}</span>
      </div>
      <div class="field">
        <span class="field-label">Programa</span>
        <span class="field-value">{enrollment.program.name}</span>
      </div>
      <div class="field">
        <span class="field-label">Periodo</span>
        <span class="field-value">{enrollment.period.name}</span>
      </div>
      <div class="field">
        <span class="field-label">Fecha de inscripción</span>
        <span class="field-value">{enrolled_at_str}</span>
      </div>
      <div class="field">
        <span class="field-label">Estado</span>
        <span class="field-value" style="color:#065f46;">Inscrito</span>
      </div>
    </div>
    <div class="footer">
      Este documento ha sido verificado contra los registros oficiales del Sistema Universitario.
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
  <title>Verificación de Inscripción — Sistema Universitario</title>
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
      <p>Verificación de Comprobante de Inscripción</p>
      <div class="badge-invalid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Documento No Encontrado
      </div>
    </div>
    <div class="body">
      <p>No se encontró una inscripción válida con este identificador.</p>
      <p style="margin-top:0.5rem;">El documento puede ser inválido, haber sido revocado o el código QR puede estar dañado.</p>
    </div>
    <div class="footer">
      Si crees que esto es un error, acude a la oficina de Servicios Escolares con tu comprobante físico.
    </div>
  </div>
</body>
</html>"""

    return HttpResponse(html, content_type='text/html; charset=utf-8')
