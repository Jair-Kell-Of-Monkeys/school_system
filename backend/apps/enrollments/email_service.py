"""
Servicio de envío de emails para notificaciones del módulo de inscripciones.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags


def send_enrollment_accepted_email(enrollment) -> bool:
    """
    Notifica al aspirante que fue aceptado e indica que debe ingresar
    al sistema para subir los documentos de inscripción.

    Args:
        enrollment: Instancia de Enrollment con student__user y program cargados.
    """
    student = enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = enrollment.program.name
    period_name = enrollment.period.name
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    subject = f'¡Felicidades! Fuiste aceptado — {program_name} — Sistema Universitario'

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
            .step {{ display: flex; align-items: flex-start; margin: 12px 0; }}
            .step-num {{ background-color: #2563eb; color: white; width: 26px; height: 26px;
                         border-radius: 50%; display: inline-flex; align-items: center;
                         justify-content: center; font-weight: bold; margin-right: 12px;
                         flex-shrink: 0; font-size: 13px; }}
            .button {{ display: inline-block; background-color: #2563eb; color: white !important;
                       padding: 14px 28px; text-decoration: none; border-radius: 8px;
                       font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">🎓 ¡Felicidades, {student_name}!</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Has sido aceptado en {program_name}</p>
        </div>

        <div class="content">
            <p style="color:#4b5563;">
                Con gran gusto te informamos que has sido <strong>aceptado</strong> en el
                proceso de admisión para el siguiente programa:
            </p>

            <div class="detail-box">
                <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Programa</p>
                <p style="margin:0;font-weight:600;">{program_name}</p>
                <p style="margin:12px 0 6px;color:#6b7280;font-size:13px;">Periodo</p>
                <p style="margin:0;font-weight:600;">{period_name}</p>
            </div>

            <h3 style="color:#1f2937;">Próximos pasos</h3>

            <div class="step">
                <span class="step-num">1</span>
                <div style="color:#4b5563;">
                    Ingresa al portal del sistema universitario y ve a la sección
                    <strong>"Mi Solicitud"</strong>.
                </div>
            </div>
            <div class="step">
                <span class="step-num">2</span>
                <div style="color:#4b5563;">
                    Sube los <strong>documentos de inscripción</strong> requeridos:
                    número de seguridad social, certificado de bachillerato y acta de nacimiento.
                </div>
            </div>
            <div class="step">
                <span class="step-num">3</span>
                <div style="color:#4b5563;">
                    Una vez aprobados tus documentos, realiza el
                    <strong>pago de inscripción</strong>.
                </div>
            </div>

            <div style="text-align:center;">
                <a href="{frontend_url}/my-application" class="button">
                    Ir al Portal — Subir Documentos
                </a>
            </div>
        </div>

        <div class="footer">
            <p style="margin:0;">© 2026 Sistema Universitario. Todos los derechos reservados.</p>
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


def send_enrollment_rejected_email(pre_enrollment) -> bool:
    """
    Notifica al aspirante que su solicitud no fue aceptada.

    Args:
        pre_enrollment: Instancia de PreEnrollment con student__user y program cargados.
    """
    student = pre_enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = pre_enrollment.program.name
    notes = pre_enrollment.notes or ''

    subject = f'Resultado de solicitud — {program_name} — Sistema Universitario'

    notes_section = ''
    if notes:
        notes_section = f"""
        <div style="background-color:#fef2f2;border:1px solid #fca5a5;padding:14px;
                    border-radius:6px;margin-top:16px;">
            <strong style="color:#991b1b;">Observaciones:</strong><br>
            <span style="color:#4b5563;margin-top:6px;display:block;">{notes}</span>
        </div>
        """

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #dc2626; color: white; padding: 30px;
                       text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">Resultado de tu Solicitud</h1>
        </div>
        <div class="content">
            <p>Hola, <strong>{student_name}</strong>.</p>
            <p style="color:#4b5563;">
                Lamentamos informarte que tu solicitud de admisión para
                <strong>{program_name}</strong> no fue aceptada en este proceso.
            </p>
            {notes_section}
            <p style="color:#4b5563;margin-top:20px;">
                Te invitamos a consultar las próximas convocatorias de admisión.
            </p>
        </div>
        <div class="footer">
            <p style="margin:0;">© 2026 Sistema Universitario. Todos los derechos reservados.</p>
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


def send_enrollment_document_rejected_email(document, notes: str = '') -> bool:
    """
    Notifica al aspirante que un documento de inscripción fue rechazado.

    Args:
        document: Instancia de EnrollmentDocument con enrollment__student__user cargados.
        notes: Observación del encargado sobre el rechazo.
    """
    student = document.enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    doc_type = document.get_document_type_display()
    program_name = document.enrollment.program.name
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    subject = f'Documento rechazado: {doc_type} — Inscripción — Sistema Universitario'

    notes_section = ''
    if notes:
        notes_section = f"""
        <div style="background-color:#fef2f2;border:1px solid #fca5a5;padding:14px;
                    border-radius:6px;margin-top:16px;">
            <strong style="color:#991b1b;">Motivo del rechazo:</strong><br>
            <span style="color:#4b5563;margin-top:6px;display:block;">{notes}</span>
        </div>
        """

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #dc2626; color: white; padding: 30px;
                       text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
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
            <h1 style="margin:0;">❌ Documento Rechazado</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Inscripción — {program_name}</p>
        </div>
        <div class="content">
            <p>Hola, <strong>{student_name}</strong>.</p>
            <p style="color:#4b5563;">
                El equipo de Servicios Escolares revisó tu documento y
                <strong>no pudo ser aprobado</strong>. Por favor corrígelo y vuelve a
                subirlo desde tu panel de inscripción.
            </p>
            <div class="detail-box">
                <p style="margin:0 0 8px;"><strong>Documento:</strong> {doc_type}</p>
                <p style="margin:0;"><strong>Estado:</strong> ❌ Rechazado</p>
            </div>
            {notes_section}
            <div style="text-align:center;margin-top:24px;">
                <a href="{frontend_url}/my-application" class="button">
                    Ir al Portal — Re-subir Documento
                </a>
            </div>
        </div>
        <div class="footer">
            <p style="margin:0;">© 2026 Sistema Universitario. Todos los derechos reservados.</p>
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


def send_enrollment_completed_email(enrollment) -> bool:
    """
    Felicita al alumno con su matrícula, correo institucional, grupo y horario asignados.
    Indica que el correo institucional será activado por el área de TI.

    Args:
        enrollment: Instancia de Enrollment con student__user, program y period cargados.
    """
    student = enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = enrollment.program.name
    period_name = enrollment.period.name
    matricula = enrollment.matricula
    institutional_email = student.institutional_email or '(pendiente de asignación)'
    group = enrollment.group or 'Por confirmar'
    schedule = enrollment.schedule or 'Por confirmar'

    subject = f'¡Inscripción completada! Matrícula {matricula} — Sistema Universitario'

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #1d4ed8; color: white; padding: 30px;
                       text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .info-box {{ background-color: white; border: 1px solid #e5e7eb;
                         padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0;
                         border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .info-label {{ color: #6b7280; font-size: 13px; }}
            .info-value {{ font-weight: 600; color: #1f2937; }}
            .matricula {{ font-size: 28px; font-weight: 800; color: #1d4ed8;
                          text-align: center; letter-spacing: 2px; padding: 16px 0; }}
            .notice {{ background-color: #eff6ff; border: 1px solid #bfdbfe;
                       padding: 14px; border-radius: 6px; margin-top: 20px; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center;
                       font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0;">🎓 ¡Bienvenido, {student_name}!</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Tu inscripción ha sido completada</p>
        </div>

        <div class="content">
            <p style="color:#4b5563;">
                Nos complace informarte que tu proceso de inscripción ha sido
                <strong>completado exitosamente</strong>. A continuación encontrarás
                los datos de tu inscripción:
            </p>

            <div class="matricula">{matricula}</div>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Programa</span>
                    <span class="info-value">{program_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Periodo</span>
                    <span class="info-value">{period_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Grupo</span>
                    <span class="info-value">{group}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Horario</span>
                    <span class="info-value">{schedule}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Correo Institucional</span>
                    <span class="info-value">{institutional_email}</span>
                </div>
            </div>

            <div class="notice">
                <strong style="color:#1d4ed8;">Sobre tu correo institucional:</strong>
                <p style="color:#4b5563;margin:8px 0 0;">
                    Tu correo institucional <strong>{institutional_email}</strong> será
                    activado por el área de TI en un plazo de 3 a 5 días hábiles.
                    Recibirás las credenciales de acceso en tu correo personal.
                </p>
            </div>

            <p style="color:#4b5563;margin-top:20px;">
                ¡Bienvenido a nuestra comunidad universitaria! Estamos emocionados
                de tenerte con nosotros.
            </p>
        </div>

        <div class="footer">
            <p style="margin:0;">© 2026 Sistema Universitario. Todos los derechos reservados.</p>
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
