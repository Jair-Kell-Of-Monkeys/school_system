# apps/credentials/generators.py
"""
Generación de PDF y QR para credenciales estudiantiles.
"""
import io
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)


def generate_qr_code_bytes(matricula: str) -> bytes:
    """
    Genera un código QR apuntando a {FRONTEND_URL}/verify/{matricula}.
    Retorna los bytes de la imagen PNG.
    """
    import qrcode

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    verify_url = f"{frontend_url}/verify/{matricula}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.read()


def generate_credential_pdf(credential_request) -> bytes:
    """
    Genera el PDF de la credencial estudiantil en diseño horizontal (landscape).
    Retorna los bytes del PDF.
    """
    from reportlab.lib.pagesizes import landscape, A5
    from reportlab.lib.units import cm, mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.platypus import HRFlowable

    enrollment = credential_request.enrollment
    student = enrollment.student
    period = enrollment.period

    # Formatear fecha de vigencia en español
    MESES = {
        1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
        5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
        9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
    }
    valid_until = period.end_date
    valid_until_str = f"{valid_until.day} de {MESES[valid_until.month]} de {valid_until.year}"

    buffer = io.BytesIO()
    page_size = landscape(A5)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        rightMargin=1.2 * cm,
        leftMargin=1.2 * cm,
        topMargin=1 * cm,
        bottomMargin=1 * cm,
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=13,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1e3a5f'),
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    subheader_style = ParagraphStyle(
        'SubHeader',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica',
        textColor=colors.HexColor('#4b5563'),
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#6b7280'),
    )
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#111827'),
    )
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=7,
        fontName='Helvetica',
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER,
    )

    story = []

    # ── Encabezado ──────────────────────────────────────────────────────────
    story.append(Paragraph('SISTEMA UNIVERSITARIO', header_style))
    story.append(Paragraph('CREDENCIAL ESTUDIANTIL', subheader_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#1e3a5f')))
    story.append(Spacer(1, 4 * mm))

    # ── Foto ────────────────────────────────────────────────────────────────
    photo_content = Spacer(1, 3 * cm)
    if student.photo:
        try:
            photo_path = os.path.join(settings.MEDIA_ROOT, str(student.photo))
            if os.path.exists(photo_path):
                photo_content = Image(photo_path, width=2.5 * cm, height=3 * cm)
        except Exception:
            pass

    # ── Datos del alumno ─────────────────────────────────────────────────────
    matricula = enrollment.matricula
    program_name = enrollment.program.name
    period_name = enrollment.period.name

    data_content = [
        Paragraph('NOMBRE', label_style),
        Paragraph(student.get_full_name(), value_style),
        Spacer(1, 3 * mm),
        Paragraph('MATRÍCULA', label_style),
        Paragraph(matricula, ParagraphStyle(
            'MatValue', parent=value_style, fontSize=13,
            textColor=colors.HexColor('#1e3a5f'),
        )),
        Spacer(1, 3 * mm),
        Paragraph('PROGRAMA', label_style),
        Paragraph(program_name, ParagraphStyle(
            'ProgValue', parent=value_style, fontSize=9,
        )),
        Spacer(1, 3 * mm),
        Paragraph('PERIODO', label_style),
        Paragraph(period_name, value_style),
        Spacer(1, 3 * mm),
        Paragraph('VÁLIDO HASTA', label_style),
        Paragraph(valid_until_str, ParagraphStyle(
            'ValidValue', parent=value_style, fontSize=9,
            textColor=colors.HexColor('#dc2626'),
        )),
    ]

    # ── QR ──────────────────────────────────────────────────────────────────
    try:
        qr_bytes = generate_qr_code_bytes(matricula)
        qr_buffer = io.BytesIO(qr_bytes)
        qr_img = Image(qr_buffer, width=2.5 * cm, height=2.5 * cm)
        qr_content = [qr_img, Spacer(1, 2 * mm), Paragraph('Verificar credencial', small_style)]
    except Exception:
        qr_content = [Spacer(1, 2.5 * cm)]

    main_table = Table(
        [[photo_content, data_content, qr_content]],
        colWidths=[3 * cm, None, 3.5 * cm],
    )
    main_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (-1, 0), (-1, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 8),
        ('RIGHTPADDING', (1, 0), (1, 0), 8),
        ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#d1d5db')),
    ]))
    story.append(main_table)

    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#d1d5db')))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        'Documento oficial de identificación estudiantil — '
        'Este documento es propiedad de la institución.',
        small_style,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
