# apps/credentials/generators.py
"""
Generación de PDF y QR para credenciales estudiantiles.
"""
import io
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Utilidad: ajuste de texto ────────────────────────────────────────────────

def _split_into_lines(text: str, font_name: str, font_size: float, max_width: float) -> list:
    """
    Divide `text` en líneas que caben dentro de `max_width` puntos.
    Usa stringWidth de reportlab para medir con precisión.
    """
    from reportlab.pdfbase.pdfmetrics import stringWidth

    words = text.split()
    lines: list = []
    line = ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if stringWidth(candidate, font_name, font_size) <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


# ─── QR ───────────────────────────────────────────────────────────────────────

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


# ─── PDF ──────────────────────────────────────────────────────────────────────

def generate_credential_pdf(credential_request) -> bytes:
    """
    Genera el PDF de la credencial estudiantil.

    Layout: A5 landscape, dos columnas, canvas directo (sin Platypus).

    ┌────────── HEADER (azul, 1.4 cm) ──────────────────────────────────┐
    │  SISTEMA UNIVERSITARIO / Credencial Estudiantil Oficial  [LOGO□]  │
    ├──── SIDEBAR ─────┬──── CONTENT ──────────────────────────────────┤
    │  (azul, 3.2 cm)  │  (blanco)                                      │
    │  foto 2.8×3.4 cm │  Nombre completo  (13 pt, azul)                │
    │  badge ESTUD.    │  Programa         (9 pt, gris, máx 2 líneas)   │
    │                  │                                                 │
    │                  │  MATRÍCULA    PERIODO                           │
    │                  │  valor        valor                             │
    │                  │  VÁLIDO HASTA TIPO                              │
    │                  │  valor(rojo)  valor                             │
    │                  │                                                 │
    │                  │  [QR 2.2cm]   ────────── firma                 │
    │                  │  Verificar    Sello institucional               │
    ├──────────────────┴─────────────────────────────────────────────── ┤
    │  FOOTER (gris claro, 0.45 cm)  "Documento oficial..."             │
    └────────────────────────────────────────────────────────────────────┘

    Retorna los bytes del PDF.
    """
    import tempfile

    from reportlab.lib.pagesizes import landscape, A5
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas as pdf_canvas

    # ── Datos ─────────────────────────────────────────────────────────────
    enrollment = credential_request.enrollment
    student    = enrollment.student
    period     = enrollment.period

    MESES = {
        1: 'enero', 2: 'febrero', 3: 'marzo',     4: 'abril',
        5: 'mayo',  6: 'junio',   7: 'julio',      8: 'agosto',
        9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
    }
    v = period.end_date
    valid_until_str = f"{v.day} de {MESES[v.month]} de {v.year}"

    # Tipo de entrega (consulta Credential si ya existe, default: Digital)
    delivery_label = 'Digital'
    try:
        from .models import Credential as _Credential
        _cred = _Credential.objects.filter(enrollment=enrollment).first()
        if _cred and _cred.delivery_method == 'physical':
            delivery_label = 'Físico'
    except Exception:
        pass

    # ── Configuración de página ───────────────────────────────────────────
    W, H = landscape(A5)          # ≈ 595.28 × 420.94 pts  (210 × 148.5 mm)
    buf = io.BytesIO()
    c   = pdf_canvas.Canvas(buf, pagesize=(W, H))

    # ── Paleta (RGB 0–1) ─────────────────────────────────────────────────
    AZUL       = (0.118, 0.227, 0.431)   # #1e3a6e
    BLANCO     = (1.0,   1.0,   1.0)
    GRIS       = (0.420, 0.447, 0.502)   # #6b7280
    ROJO       = (0.863, 0.157, 0.157)   # #dc2626
    FONDO_FOOT = (0.976, 0.980, 0.984)   # #f9fafb
    BORDE_GRIS = (0.820, 0.835, 0.855)   # #d1d5db
    OSCURO     = (0.067, 0.094, 0.153)   # #111827

    # ── Medidas base ─────────────────────────────────────────────────────
    HEADER_H  = 1.4  * cm
    FOOTER_H  = 0.45 * cm
    SIDEBAR_W = 3.2  * cm
    PAD       = 0.35 * cm

    y_header = H - HEADER_H
    body_h   = H - HEADER_H - FOOTER_H

    # ═══════════════════════════════════════════════════════════════════════
    # 1. FONDOS
    # ═══════════════════════════════════════════════════════════════════════

    # Página blanca base
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Barra de encabezado (azul)
    c.setFillColorRGB(*AZUL)
    c.rect(0, y_header, W, HEADER_H, fill=1, stroke=0)

    # Columna lateral (azul)
    c.rect(0, FOOTER_H, SIDEBAR_W, body_h, fill=1, stroke=0)

    # Barra de pie (gris claro)
    c.setFillColorRGB(*FONDO_FOOT)
    c.rect(0, 0, W, FOOTER_H, fill=1, stroke=0)

    # Línea divisoria sidebar / contenido
    c.setStrokeColorRGB(*BORDE_GRIS)
    c.setLineWidth(0.3)
    c.line(SIDEBAR_W, FOOTER_H, SIDEBAR_W, y_header)

    # ═══════════════════════════════════════════════════════════════════════
    # 2. ENCABEZADO
    # ═══════════════════════════════════════════════════════════════════════

    c.setFillColorRGB(*BLANCO)
    c.setFont('Helvetica-Bold', 8.5)
    c.drawString(SIDEBAR_W + PAD, y_header + 0.62 * cm, 'SISTEMA UNIVERSITARIO')
    c.setFont('Helvetica', 6.5)
    c.drawString(SIDEBAR_W + PAD, y_header + 0.22 * cm, 'Credencial Estudiantil Oficial')

    # Placeholder de logo (rect blanco semitransparente, extremo derecho)
    logo_w = 1.5 * cm
    logo_h = 1.1 * cm
    logo_x = W - logo_w - 0.3 * cm
    logo_y = y_header + (HEADER_H - logo_h) / 2
    c.setFillColorRGB(*BLANCO)
    c.setFillAlpha(0.25)
    c.roundRect(logo_x, logo_y, logo_w, logo_h, 2, fill=1, stroke=0)
    c.setFillAlpha(1.0)

    # ═══════════════════════════════════════════════════════════════════════
    # 3. SIDEBAR — foto + badge
    # ═══════════════════════════════════════════════════════════════════════

    PHOTO_W = 2.8 * cm
    PHOTO_H = 3.4 * cm
    BORDER  = 0.1 * cm
    photo_x = (SIDEBAR_W - PHOTO_W) / 2
    photo_y = y_header - 0.4 * cm - PHOTO_H

    # Marco blanco alrededor de la foto
    c.setFillColorRGB(*BLANCO)
    c.roundRect(
        photo_x - BORDER, photo_y - BORDER,
        PHOTO_W + 2 * BORDER, PHOTO_H + 2 * BORDER,
        3, fill=1, stroke=0,
    )

    # ── Foto del alumno ────────────────────────────────────────────────────
    #   - URL remota (Cloudinary): se descarga a NamedTemporaryFile
    #   - Path local: se usa directamente
    #   - Cualquier excepción: rect gris como placeholder
    photo_tmp_path: str | None = None
    _photo_is_downloaded = False
    try:
        if student.photo:
            raw_url = student.photo.url
            if raw_url.startswith('http'):
                import requests as _req
                resp = _req.get(raw_url, timeout=10)
                resp.raise_for_status()
                ct  = resp.headers.get('content-type', '')
                ext = '.png' if ('png' in ct or raw_url.lower().endswith('.png')) else '.jpg'
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
                    tf.write(resp.content)
                    photo_tmp_path = tf.name
                _photo_is_downloaded = True
            else:
                local_path = os.path.join(settings.MEDIA_ROOT, str(student.photo))
                if not os.path.exists(local_path):
                    raise FileNotFoundError(local_path)
                photo_tmp_path = local_path

            c.drawImage(
                photo_tmp_path, photo_x, photo_y,
                width=PHOTO_W, height=PHOTO_H,
                preserveAspectRatio=True, anchor='c',
            )
        else:
            raise ValueError('sin foto')
    except Exception:
        # Placeholder gris
        c.setFillColorRGB(*GRIS)
        c.rect(photo_x, photo_y, PHOTO_W, PHOTO_H, fill=1, stroke=0)
    finally:
        if _photo_is_downloaded and photo_tmp_path and os.path.exists(photo_tmp_path):
            try:
                os.unlink(photo_tmp_path)
            except OSError:
                pass

    # Badge "ESTUD." debajo de la foto
    badge_w, badge_h = 2.2 * cm, 0.42 * cm
    badge_x = (SIDEBAR_W - badge_w) / 2
    badge_y = photo_y - 0.6 * cm
    c.setFillColorRGB(*BLANCO)
    c.setFillAlpha(0.20)
    c.roundRect(badge_x, badge_y, badge_w, badge_h, 3, fill=1, stroke=0)
    c.setFillAlpha(1.0)
    c.setFillColorRGB(*BLANCO)
    c.setFont('Helvetica-Bold', 6)
    c.drawCentredString(SIDEBAR_W / 2, badge_y + 0.14 * cm, 'ESTUD.')

    # ═══════════════════════════════════════════════════════════════════════
    # 4. CONTENIDO (columna derecha)
    # ═══════════════════════════════════════════════════════════════════════

    x0    = SIDEBAR_W + PAD
    col_w = (W - SIDEBAR_W - 2 * PAD) / 2   # ancho de cada mitad del grid
    # cursor: posición vertical actual (en pts), decrece hacia abajo
    cursor = y_header - PAD

    # ── Nombre completo (13 pt, azul) ─────────────────────────────────────
    c.setFont('Helvetica-Bold', 13)
    c.setFillColorRGB(*AZUL)
    cursor -= 13
    c.drawString(x0, cursor, student.get_full_name().upper())
    cursor -= 0.2 * cm

    # ── Programa (9 pt, gris, máx 2 líneas) ──────────────────────────────
    prog_lines = _split_into_lines(enrollment.program.name, 'Helvetica', 9, col_w * 2)[:2]
    c.setFont('Helvetica', 9)
    c.setFillColorRGB(*GRIS)
    for prog_line in prog_lines:
        cursor -= round(9 * 1.35)
        c.drawString(x0, cursor, prog_line)
    cursor -= 0.55 * cm

    # ── Grid 2×2 ──────────────────────────────────────────────────────────

    # Fila 1 — etiquetas
    c.setFont('Helvetica-Bold', 6.5)
    c.setFillColorRGB(*GRIS)
    c.drawString(x0,         cursor, 'MATRÍCULA')
    c.drawString(x0 + col_w, cursor, 'PERIODO')
    cursor -= round(6.5 * 1.3)

    # Fila 1 — valores
    c.setFont('Courier-Bold', 11)
    c.setFillColorRGB(*OSCURO)
    c.drawString(x0, cursor, enrollment.matricula)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(x0 + col_w, cursor, enrollment.period.name)
    cursor -= 0.55 * cm

    # Fila 2 — etiquetas
    c.setFont('Helvetica-Bold', 6.5)
    c.setFillColorRGB(*GRIS)
    c.drawString(x0,         cursor, 'VÁLIDO HASTA')
    c.drawString(x0 + col_w, cursor, 'TIPO')
    cursor -= round(6.5 * 1.3)

    # Fila 2 — valores
    c.setFont('Helvetica-Bold', 10)
    c.setFillColorRGB(*ROJO)
    c.drawString(x0, cursor, valid_until_str)
    c.setFillColorRGB(*OSCURO)
    c.drawString(x0 + col_w, cursor, delivery_label)

    # ═══════════════════════════════════════════════════════════════════════
    # 5. FILA INFERIOR — QR + línea de firma (anclados sobre el footer)
    # ═══════════════════════════════════════════════════════════════════════

    QR_SIZE = 2.2 * cm
    qr_y    = FOOTER_H + PAD     # base del QR, justo sobre la barra de pie

    qr_tmp_path: str | None = None
    try:
        qr_bytes = generate_qr_code_bytes(enrollment.matricula)
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tf:
            tf.write(qr_bytes)
            qr_tmp_path = tf.name
        c.drawImage(qr_tmp_path, x0, qr_y, width=QR_SIZE, height=QR_SIZE)
        c.setFont('Helvetica', 5.5)
        c.setFillColorRGB(*GRIS)
        c.drawCentredString(x0 + QR_SIZE / 2, qr_y - 0.25 * cm, 'Verificar credencial')
    except Exception:
        logger.warning('[credential_pdf] QR no generado para matrícula %s', enrollment.matricula)
    finally:
        if qr_tmp_path and os.path.exists(qr_tmp_path):
            try:
                os.unlink(qr_tmp_path)
            except OSError:
                pass

    # Línea de firma (mitad derecha, alineada con el QR)
    firma_x = x0 + col_w
    firma_y = qr_y + QR_SIZE * 0.65
    c.setStrokeColorRGB(*BORDE_GRIS)
    c.setLineWidth(0.5)
    c.line(firma_x, firma_y, firma_x + 2.8 * cm, firma_y)
    c.setFont('Helvetica', 6)
    c.setFillColorRGB(*GRIS)
    c.drawString(firma_x, firma_y - 0.3 * cm, 'Sello institucional')

    # ═══════════════════════════════════════════════════════════════════════
    # 6. BARRA DE PIE
    # ═══════════════════════════════════════════════════════════════════════

    c.setFont('Helvetica', 6)
    c.setFillColorRGB(*GRIS)
    c.drawRightString(
        W - PAD,
        FOOTER_H * 0.30,
        'Documento oficial de identificación — Propiedad de la institución',
    )

    c.save()
    buf.seek(0)
    return buf.read()
