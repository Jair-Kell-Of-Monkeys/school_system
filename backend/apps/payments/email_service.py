"""
Servicio de envío de emails para notificaciones del módulo de pagos.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags


def send_payment_rejected_email(payment) -> bool:
    """
    Notifica al aspirante que su comprobante de pago fue rechazado.

    Args:
        payment: Instancia de Payment con pre_enrollment__student__user y
                 validated_by cargados.
    """
    student = payment.pre_enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = payment.pre_enrollment.program.name
    rejection_notes = payment.validation_notes or 'Sin observaciones adicionales.'
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    subject = f'Comprobante de pago rechazado — {program_name} — Sistema Universitario'

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #dc2626; color: white; padding: 30px;
                       text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px;
                        border: 1px solid #e5e7eb; }}
            .detail-box {{ background-color: white; border: 1px solid #e5e7eb;
                           padding: 16px; border-radius: 8px; margin: 20px 0; }}
            .rejection-box {{ background-color: #fef2f2; border: 1px solid #fca5a5;
                              padding: 14px; border-radius: 6px; margin-top: 16px; }}
            .button {{ display: inline-block; background-color: #2563eb; color: white !important;
                       padding: 14px 28px; text-decoration: none; border-radius: 8px;
                       font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">❌ Comprobante Rechazado</h1>
        </div>

        <div class="content">
            <p>Hola, <strong>{student_name}</strong>.</p>
            <p>
                El equipo de Finanzas revisó tu comprobante de pago para el proceso de
                admisión y <strong>no pudo ser validado</strong>.
            </p>

            <div class="detail-box">
                <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Programa</p>
                <p style="margin:0;font-weight:600;">{program_name}</p>
                <p style="margin:12px 0 6px;color:#6b7280;font-size:13px;">Concepto</p>
                <p style="margin:0;font-weight:600;">{payment.get_payment_type_display()}</p>
                <p style="margin:12px 0 6px;color:#6b7280;font-size:13px;">No. de referencia</p>
                <p style="margin:0;font-weight:600;font-family:monospace;">{payment.reference_number}</p>
            </div>

            <div class="rejection-box">
                <strong style="color:#991b1b;">Motivo del rechazo:</strong><br>
                <span style="color:#4b5563;margin-top:6px;display:block;">{rejection_notes}</span>
            </div>

            <p style="margin-top:20px;">
                Por favor ingresa al sistema, descarga tu ficha de pago y sube un nuevo
                comprobante que cumpla con los requisitos indicados.
            </p>

            <div style="text-align:center;">
                <a href="{frontend_url}" class="button">Ir al Portal</a>
            </div>
        </div>

        <div class="footer">
            <p style="margin:0;">Sistema Universitario &mdash; Notificación automática</p>
            <p style="margin:4px 0 0;">Por favor no respondas a este correo.</p>
        </div>
    </body>
    </html>
    """

    try:
        send_mail(
            subject=subject,
            message=strip_tags(html_message),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception:
        return False
