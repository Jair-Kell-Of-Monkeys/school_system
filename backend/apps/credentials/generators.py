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
    Genera el PDF de la credencial estudiantil en formato tarjeta (85.6 × 54 mm).

    Layout institucional:
    ┌──────────────── FRANJA AZUL SUPERIOR (#1a56db) ────────────────────┐
    │  SISTEMA UNIVERSITARIO          Credencial Estudiantil Oficial      │
    ├─SIDEBAR─┬── FOTO ──┬──── DATOS DEL ESTUDIANTE ──────────┬─── QR ──┤
    │ #1240a0 │  blanco  │ Nombre completo  (bold)             │ 14×14mm │
    │ rotated │  borde   │ Programa         (gris)             │         │
    │  text   │          │ MATRÍCULA        (azul highlight)   │         │
    │         │          │ PERÍODO VIGENTE                      │         │
    ├─────────┴──────────┴─────────────────────────────────────┴─────────┤
    │              FRANJA AZUL INFERIOR — "CREDENCIAL ESTUDIANTIL VÁLIDA" │
    └────────────────────────────────────────────────────────────────────┘
    """
    import tempfile

    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as pdf_canvas

    # ── Datos ─────────────────────────────────────────────────────────────
    enrollment = credential_request.enrollment
    student    = enrollment.student
    period     = enrollment.period

    # ── Tamaño tarjeta estándar ───────────────────────────────────────────
    W = 85.6 * mm   # ≈ 242.65 pts
    H = 54.0 * mm   # ≈ 153.07 pts

    buf = io.BytesIO()
    c   = pdf_canvas.Canvas(buf, pagesize=(W, H))

    # ── Paleta (RGB 0–1) ─────────────────────────────────────────────────
    BRAND      = (0.102, 0.337, 0.859)   # #1a56db
    BRAND_DARK = (0.071, 0.251, 0.627)   # #1240a0
    BLANCO     = (1.0,   1.0,   1.0)
    GRIS       = (0.420, 0.447, 0.502)   # #6b7280
    OSCURO     = (0.067, 0.094, 0.153)   # #111827
    BORDE      = (0.820, 0.835, 0.855)   # #d1d5db
    HIGHLIGHT  = (0.859, 0.906, 0.996)   # #dbeafe

    # ── Medidas (en pts, via mm unit) ────────────────────────────────────
    TOP_H  = 8.5 * mm
    BOT_H  = 4.5 * mm
    SIDE_W = 11.0 * mm
    PAD    = 2.0 * mm

    body_top = H - TOP_H
    body_h   = H - TOP_H - BOT_H   # 41 mm

    # ═══════════════════════════════════════════════════════════════════════
    # 1. FONDOS
    # ═══════════════════════════════════════════════════════════════════════

    # Blanco base
    c.setFillColorRGB(*BLANCO)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Textura: líneas diagonales muy sutiles en el área del cuerpo
    c.setStrokeColorRGB(0.90, 0.93, 0.99)
    c.setLineWidth(0.4)
    step = 5 * mm
    for i in range(int(-body_h), int(W + body_h + step), int(step)):
        c.line(SIDE_W + i, BOT_H, SIDE_W + i + body_h, body_top)

    # Franja superior azul
    c.setFillColorRGB(*BRAND)
    c.rect(0, body_top, W, TOP_H, fill=1, stroke=0)

    # Sidebar izquierdo azul oscuro
    c.setFillColorRGB(*BRAND_DARK)
    c.rect(0, BOT_H, SIDE_W, body_h, fill=1, stroke=0)

    # Franja inferior azul
    c.setFillColorRGB(*BRAND)
    c.rect(0, 0, W, BOT_H, fill=1, stroke=0)

    # ═══════════════════════════════════════════════════════════════════════
    # 2. FRANJA SUPERIOR
    # ═══════════════════════════════════════════════════════════════════════

    c.setFillColorRGB(*BLANCO)
    c.setFont('Helvetica-Bold', 7.5)
    c.drawString(SIDE_W + PAD, body_top + 4.8 * mm, 'SISTEMA UNIVERSITARIO')
    c.setFont('Helvetica', 5.5)
    c.setFillColorRGB(0.78, 0.87, 0.99)   # #c7d9f8
    c.drawString(SIDE_W + PAD, body_top + 1.5 * mm, 'Credencial Estudiantil Oficial')

    # ═══════════════════════════════════════════════════════════════════════
    # 3. SIDEBAR — texto institucional rotado
    # ═══════════════════════════════════════════════════════════════════════

    sidebar_cx = SIDE_W / 2
    sidebar_cy = BOT_H + body_h / 2
    c.saveState()
    c.translate(sidebar_cx, sidebar_cy)
    c.rotate(90)
    c.setFillColorRGB(*BLANCO)
    c.setFont('Helvetica-Bold', 6.5)
    c.drawCentredString(0, 1.5 * mm, 'SISTEMA')
    c.setFont('Helvetica', 5.0)
    c.setFillColorRGB(0.78, 0.87, 0.99)
    c.drawCentredString(0, -2.5 * mm, 'UNIVERSITARIO')
    c.restoreState()

    # ═══════════════════════════════════════════════════════════════════════
    # 4. FOTO del estudiante
    # ═══════════════════════════════════════════════════════════════════════

    PHOTO_W = 17.0 * mm
    PHOTO_H = 21.0 * mm
    BORDER  = 0.8 * mm
    photo_x = SIDE_W + PAD
    photo_y = BOT_H + (body_h - PHOTO_H) / 2   # centrada verticalmente

    # Marco blanco
    c.setFillColorRGB(*BLANCO)
    c.rect(
        photo_x - BORDER, photo_y - BORDER,
        PHOTO_W + 2 * BORDER, PHOTO_H + 2 * BORDER,
        fill=1, stroke=0,
    )

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
        # Placeholder gris con silueta
        c.setFillColorRGB(*BORDE)
        c.rect(photo_x, photo_y, PHOTO_W, PHOTO_H, fill=1, stroke=0)
        cx = photo_x + PHOTO_W / 2
        c.setFillColorRGB(*GRIS)
        c.circle(cx, photo_y + PHOTO_H * 0.66, PHOTO_W * 0.18, fill=1, stroke=0)
        c.ellipse(
            cx - PHOTO_W * 0.26, photo_y,
            cx + PHOTO_W * 0.26, photo_y + PHOTO_H * 0.44,
            fill=1, stroke=0,
        )
    finally:
        if _photo_is_downloaded and photo_tmp_path and os.path.exists(photo_tmp_path):
            try:
                os.unlink(photo_tmp_path)
            except OSError:
                pass

    # ═══════════════════════════════════════════════════════════════════════
    # 5. CONTENIDO — Datos del estudiante
    # ═══════════════════════════════════════════════════════════════════════

    # x0: inicio del área de texto (a la derecha de la foto)
    x0 = photo_x + PHOTO_W + PAD

    # QR reserva la esquina inferior derecha
    QR_SIZE = 14.0 * mm
    qr_x    = W - QR_SIZE - PAD
    qr_y    = BOT_H + PAD

    # Ancho máximo de texto para no solapar QR
    text_w = qr_x - x0 - PAD

    # cursor: y-position (pts), decrece hacia abajo
    cursor = body_top - PAD

    # ── Nombre completo ────────────────────────────────────────────────────
    NAME_PT = 8.0
    name_lines = _split_into_lines(
        student.get_full_name().upper(), 'Helvetica-Bold', NAME_PT, text_w
    )[:2]
    c.setFont('Helvetica-Bold', NAME_PT)
    c.setFillColorRGB(*OSCURO)
    for line in name_lines:
        cursor -= NAME_PT
        c.drawString(x0, cursor, line)
        cursor -= NAME_PT * 0.25

    cursor -= 1.5 * mm

    # ── Programa ──────────────────────────────────────────────────────────
    PROG_PT = 6.0
    prog_lines = _split_into_lines(
        enrollment.program.name, 'Helvetica', PROG_PT, text_w
    )[:2]
    c.setFont('Helvetica', PROG_PT)
    c.setFillColorRGB(*GRIS)
    for line in prog_lines:
        cursor -= PROG_PT
        c.drawString(x0, cursor, line)
        cursor -= PROG_PT * 0.25

    cursor -= 3.0 * mm

    # ── Label MATRÍCULA ───────────────────────────────────────────────────
    LABEL_PT = 4.8
    c.setFont('Helvetica-Bold', LABEL_PT)
    c.setFillColorRGB(*GRIS)
    cursor -= LABEL_PT
    c.drawString(x0, cursor, 'MATRÍCULA')
    cursor -= LABEL_PT * 0.4 + 1.0 * mm

    # ── Valor matrícula con highlight ─────────────────────────────────────
    MAT_PT  = 9.5
    mat_str = enrollment.matricula
    mat_tw  = c.stringWidth(mat_str, 'Courier-Bold', MAT_PT)

    # Calcular baseline primero, luego posicionar el rect respecto a ella
    cursor -= MAT_PT
    baseline = cursor

    V_PAD = 1.5 * mm   # padding simétrico arriba/abajo respecto al cap-height
    H_PAD = 1.2 * mm   # padding horizontal
    CAP_H = MAT_PT * 0.72   # altura visible de mayúsculas/números

    c.setFillColorRGB(*HIGHLIGHT)
    c.roundRect(
        x0 - H_PAD,
        baseline - V_PAD,
        mat_tw + 2 * H_PAD,
        CAP_H + 2 * V_PAD,
        1.5, fill=1, stroke=0,
    )
    c.setFont('Courier-Bold', MAT_PT)
    c.setFillColorRGB(*BRAND)
    c.drawString(x0, baseline, mat_str)
    cursor -= 3.0 * mm

    # ── Label PERÍODO VIGENTE ─────────────────────────────────────────────
    c.setFont('Helvetica-Bold', LABEL_PT)
    c.setFillColorRGB(*GRIS)
    cursor -= LABEL_PT
    c.drawString(x0, cursor, 'PERÍODO VIGENTE')
    cursor -= LABEL_PT * 0.4 + 0.5 * mm

    # ── Valor período ─────────────────────────────────────────────────────
    PER_PT = 6.5
    c.setFont('Helvetica-Bold', PER_PT)
    c.setFillColorRGB(*OSCURO)
    cursor -= PER_PT
    c.drawString(x0, cursor, period.name)

    # ═══════════════════════════════════════════════════════════════════════
    # 6. QR — esquina inferior derecha
    # ═══════════════════════════════════════════════════════════════════════

    qr_tmp_path: str | None = None
    try:
        qr_bytes = generate_qr_code_bytes(enrollment.matricula)
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tf:
            tf.write(qr_bytes)
            qr_tmp_path = tf.name
        c.drawImage(qr_tmp_path, qr_x, qr_y, width=QR_SIZE, height=QR_SIZE)
        c.setFont('Helvetica', 4.0)
        c.setFillColorRGB(*GRIS)
        c.drawCentredString(qr_x + QR_SIZE / 2, qr_y - 2.5 * mm, 'Verificar')
    except Exception:
        logger.warning('[credential_pdf] QR no generado para matrícula %s', enrollment.matricula)
    finally:
        if qr_tmp_path and os.path.exists(qr_tmp_path):
            try:
                os.unlink(qr_tmp_path)
            except OSError:
                pass

    # ═══════════════════════════════════════════════════════════════════════
    # 7. FRANJA INFERIOR
    # ═══════════════════════════════════════════════════════════════════════

    c.setFont('Helvetica-Bold', 4.5)
    c.setFillColorRGB(*BLANCO)
    c.drawCentredString(W / 2, BOT_H * 0.28, 'CREDENCIAL ESTUDIANTIL VÁLIDA')

    c.save()
    buf.seek(0)
    return buf.read()
