"""
Servicio de envío de emails para revisión de documentos de pre-inscripción.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags


def send_document_review_email(document, action: str, reviewer_notes: str = '') -> bool:
    """
    Envía email al aspirante notificando la aprobación o rechazo de un documento.

    Args:
        document: Instancia de Document con pre_enrollment__student__user cargado.
        action: 'approve' o 'reject'.
        reviewer_notes: Observación opcional del encargado.
    """
    student = document.pre_enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    doc_type = document.get_document_type_display()
    program_name = document.pre_enrollment.program.name

    if action == 'approve':
        subject = f'Documento aprobado: {doc_type} — Sistema Universitario'
        header_color = '#16a34a'
        status_text = '✅ Aprobado'
        body_text = (
            'Tu documento ha sido revisado y <strong>aprobado</strong> '
            'por el equipo de Servicios Escolares.'
        )
    else:
        subject = f'Documento rechazado: {doc_type} — Sistema Universitario'
        header_color = '#dc2626'
        status_text = '❌ Rechazado'
        body_text = (
            'Tu documento ha sido revisado y <strong>rechazado</strong>. '
            'Por favor corrígelo y vuelve a subirlo desde tu panel de aspirante.'
        )

    notes_section = ''
    if reviewer_notes:
        notes_section = f"""
        <div style="background-color:#fef9c3;border:1px solid #ca8a04;padding:14px;
                    border-radius:6px;margin-top:16px;">
            <strong style="color:#92400e;">Observación del revisor:</strong><br>
            <span style="color:#4b5563;margin-top:6px;display:block;">{reviewer_notes}</span>
        </div>
        """

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: {header_color}; color: white; padding: 30px;
                       text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px;
                        border: 1px solid #e5e7eb; }}
            .detail-box {{ background-color: white; border: 1px solid #e5e7eb;
                           padding: 16px; border-radius: 8px; margin: 20px 0; }}
            .button {{ display: inline-block; background-color: #2563eb; color: white !important;
                       padding: 14px 28px; text-decoration: none; border-radius: 8px;
                       font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">🎓 Sistema Universitario</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Revisión de Documento</p>
        </div>

        <div class="content">
            <h2 style="color:#1f2937;">Hola, {student_name}</h2>
            <p style="color:#4b5563;">{body_text}</p>

            <div class="detail-box">
                <p style="margin:0 0 8px 0;"><strong>Documento:</strong> {doc_type}</p>
                <p style="margin:0 0 8px 0;"><strong>Programa:</strong> {program_name}</p>
                <p style="margin:0;"><strong>Estado:</strong> {status_text}</p>
            </div>

            {notes_section}

            <div style="text-align:center;margin-top:24px;">
                <a href="{settings.FRONTEND_URL}/dashboard" class="button">
                    Ver mi solicitud
                </a>
            </div>
        </div>

        <div class="footer">
            <p>© 2026 Sistema Universitario. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    """

    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error enviando email de revisión de documento: {e}")
        return False


def send_all_documents_approved_email(pre_enrollment) -> bool:
    """
    Envía al aspirante la notificación de que todos sus documentos fueron aprobados
    y su solicitud avanza al siguiente paso.

    Args:
        pre_enrollment: Instancia de PreEnrollment con student__user y program cargados.
    """
    student = pre_enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = pre_enrollment.program.name
    period_name = pre_enrollment.period.name

    subject = f'¡Documentos aprobados! — {program_name} — Sistema Universitario'

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #16a34a; color: white; padding: 30px;
                       text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px;
                        border: 1px solid #e5e7eb; }}
            .detail-box {{ background-color: white; border: 1px solid #e5e7eb;
                           padding: 16px; border-radius: 8px; margin: 20px 0; }}
            .next-step {{ display: flex; align-items: flex-start; margin: 12px 0; }}
            .button {{ display: inline-block; background-color: #2563eb; color: white !important;
                       padding: 14px 28px; text-decoration: none; border-radius: 8px;
                       font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">✅ ¡Documentos Aprobados!</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Tu solicitud avanza al siguiente paso</p>
        </div>

        <div class="content">
            <h2 style="color:#1f2937;">¡Felicidades, {student_name}!</h2>
            <p style="color:#4b5563;">
                El equipo de Servicios Escolares ha revisado y <strong>aprobado todos
                tus documentos</strong>. Tu solicitud de admisión ha avanzado al
                siguiente paso del proceso.
            </p>

            <div class="detail-box">
                <p style="margin:0 0 8px 0;"><strong>Programa:</strong> {program_name}</p>
                <p style="margin:0;"><strong>Periodo:</strong> {period_name}</p>
            </div>

            <h3 style="color:#1f2937;">¿Qué sigue?</h3>
            <div class="next-step">
                <span style="background-color:#2563eb;color:white;width:26px;height:26px;
                             border-radius:50%;display:inline-flex;align-items:center;
                             justify-content:center;font-weight:bold;margin-right:12px;
                             flex-shrink:0;">1</span>
                <div style="color:#4b5563;">
                    Realiza el <strong>pago de inscripción</strong> y sube el comprobante
                    desde tu panel de aspirante.
                </div>
            </div>
            <div class="next-step">
                <span style="background-color:#2563eb;color:white;width:26px;height:26px;
                             border-radius:50%;display:inline-flex;align-items:center;
                             justify-content:center;font-weight:bold;margin-right:12px;
                             flex-shrink:0;">2</span>
                <div style="color:#4b5563;">
                    Una vez validado el pago se te asignará fecha para el
                    <strong>examen de admisión</strong>.
                </div>
            </div>

            <div style="text-align:center;margin-top:24px;">
                <a href="{settings.FRONTEND_URL}/dashboard" class="button">
                    Ver mi solicitud
                </a>
            </div>
        </div>

        <div class="footer">
            <p>© 2026 Sistema Universitario. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    """

    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error enviando email de todos los documentos aprobados: {e}")
        return False
