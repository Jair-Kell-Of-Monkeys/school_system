"""
Servicio de envío de emails para el módulo de credenciales.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags


def send_credential_request_received_email(credential_request) -> bool:
    """
    Confirma al alumno que su solicitud de credencial fue recibida.
    """
    enrollment = credential_request.enrollment
    student = enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = enrollment.program.name
    convocatoria_title = credential_request.convocatoria.title
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    subject = 'Solicitud de Credencial Recibida — Sistema Universitario'

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #2563eb; color: white; padding: 30px;
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
            <h1 style="margin:0;">Solicitud Recibida</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Tu solicitud de credencial está en revisión</p>
        </div>
        <div class="content">
            <p style="color:#4b5563;">Hola <strong>{student_name}</strong>,</p>
            <p style="color:#4b5563;">
                Hemos recibido tu solicitud de credencial estudiantil. Será revisada por
                el encargado de tu programa en los próximos días.
            </p>
            <div class="detail-box">
                <p style="margin:0 0 8px 0;"><strong>Convocatoria:</strong> {convocatoria_title}</p>
                <p style="margin:0 0 8px 0;"><strong>Matrícula:</strong> {enrollment.matricula}</p>
                <p style="margin:0;"><strong>Programa:</strong> {program_name}</p>
            </div>
            <p style="color:#4b5563;">
                Te notificaremos por correo cuando tu solicitud sea revisada.
            </p>
            <a href="{frontend_url}/my-application" class="button">Ver mi solicitud</a>
        </div>
        <div class="footer">
            <p>Sistema Universitario — Servicios Escolares</p>
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
    except Exception:
        return False


def send_credential_approved_email(credential_request) -> bool:
    """
    Notifica al alumno que su credencial está lista para descargar.
    """
    enrollment = credential_request.enrollment
    student = enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = enrollment.program.name
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    subject = '¡Tu Credencial Estudiantil está Lista! — Sistema Universitario'

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
            .button {{ display: inline-block; background-color: #16a34a; color: white !important;
                       padding: 14px 28px; text-decoration: none; border-radius: 8px;
                       font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">¡Credencial Lista!</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Tu credencial estudiantil ha sido generada</p>
        </div>
        <div class="content">
            <p style="color:#4b5563;">Hola <strong>{student_name}</strong>,</p>
            <p style="color:#4b5563;">
                Tu credencial estudiantil ha sido <strong>aprobada y generada</strong>.
                Ya puedes descargarla desde tu panel.
            </p>
            <div class="detail-box">
                <p style="margin:0 0 8px 0;"><strong>Matrícula:</strong> {enrollment.matricula}</p>
                <p style="margin:0 0 8px 0;"><strong>Programa:</strong> {program_name}</p>
                <p style="margin:0;"><strong>Periodo:</strong> {enrollment.period.name}</p>
            </div>
            <p style="color:#4b5563;">
                Conserva tu credencial — la necesitarás para identificarte en las
                instalaciones universitarias.
            </p>
            <a href="{frontend_url}/my-application" class="button">Descargar mi Credencial</a>
        </div>
        <div class="footer">
            <p>Sistema Universitario — Servicios Escolares</p>
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
    except Exception:
        return False


def send_credential_rejected_email(credential_request) -> bool:
    """
    Notifica al alumno el motivo del rechazo de su solicitud de credencial.
    """
    enrollment = credential_request.enrollment
    student = enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    rejection_reason = credential_request.rejection_reason or 'Sin motivo especificado.'
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    subject = 'Solicitud de Credencial Rechazada — Sistema Universitario'

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
            .reason-box {{ background-color: #fef2f2; border: 1px solid #fca5a5;
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
            <h1 style="margin:0;">Solicitud No Aprobada</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Tu solicitud de credencial requiere atención</p>
        </div>
        <div class="content">
            <p style="color:#4b5563;">Hola <strong>{student_name}</strong>,</p>
            <p style="color:#4b5563;">
                Lamentamos informarte que tu solicitud de credencial no fue aprobada
                por el siguiente motivo:
            </p>
            <div class="reason-box">
                <p style="margin:0; color:#991b1b;">{rejection_reason}</p>
            </div>
            <p style="color:#4b5563;">
                Si tienes dudas, acude a la oficina de Servicios Escolares para más información.
            </p>
            <a href="{frontend_url}/my-application" class="button">Ver mi solicitud</a>
        </div>
        <div class="footer">
            <p>Sistema Universitario — Servicios Escolares</p>
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
    except Exception:
        return False
