"""
Servicio de emails para el módulo de exámenes de admisión.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags


def send_exam_assigned_email(pre_enrollment) -> bool:
    """
    Notifica al aspirante los detalles de su examen de admisión.

    Args:
        pre_enrollment: instancia de PreEnrollment con student__user,
                        program y period cargados.
    """
    student = pre_enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = pre_enrollment.program.name
    period_name = pre_enrollment.period.name

    exam_dt = pre_enrollment.exam_date
    if exam_dt:
        fecha_str = exam_dt.strftime('%A %d de %B de %Y').capitalize()
        hora_str = exam_dt.strftime('%H:%M')
    else:
        fecha_str = 'Por confirmar'
        hora_str = 'Por confirmar'

    mode_display = (
        'Presencial' if pre_enrollment.exam_mode == 'presencial' else 'En Línea'
    )
    location = pre_enrollment.exam_location or 'Por confirmar'

    subject = f'¡Tu examen de admisión ha sido asignado! — {program_name}'

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
            <h1 style="margin:0;">📅 Examen de Admisión Asignado</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">Ya tienes fecha para tu examen</p>
        </div>

        <div class="content">
            <h2 style="color:#1f2937;">Hola, {student_name}</h2>
            <p style="color:#4b5563;">
                Se te ha asignado una fecha para tu <strong>examen de admisión</strong>
                al programa <strong>{program_name}</strong>, periodo
                <strong>{period_name}</strong>.
            </p>

            <div class="detail-box">
                <p style="margin:0 0 10px;font-size:13px;color:#6b7280;
                           text-transform:uppercase;letter-spacing:.05em;font-weight:600;">
                    Detalles del Examen
                </p>
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:6px 0;color:#6b7280;width:130px;">Fecha:</td>
                        <td style="padding:6px 0;color:#1f2937;font-weight:600;">{fecha_str}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#6b7280;">Hora:</td>
                        <td style="padding:6px 0;color:#1f2937;font-weight:600;">{hora_str}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#6b7280;">Modalidad:</td>
                        <td style="padding:6px 0;color:#1f2937;font-weight:600;">{mode_display}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#6b7280;">Ubicación:</td>
                        <td style="padding:6px 0;color:#1f2937;font-weight:600;">{location}</td>
                    </tr>
                </table>
            </div>

            <div style="background-color:#fef3c7;border:1px solid #d97706;padding:14px;
                        border-radius:6px;margin-bottom:20px;">
                <strong style="color:#92400e;">⚠️ Recuerda presentarte:</strong>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#78350f;">
                    <li>Puntual con al menos 15 minutos de anticipación.</li>
                    <li>Con identificación oficial vigente (INE o pasaporte).</li>
                    <li>Con tu CURP impresa o disponible en tu dispositivo.</li>
                </ul>
            </div>

            <div style="text-align:center;">
                <a href="{settings.FRONTEND_URL}/my-application" class="button">
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
        print(f"Error enviando email de asignación de examen: {e}")
        return False


def send_exam_result_email(pre_enrollment, passing_score=None) -> bool:
    """
    Notifica al aspirante el resultado del examen de admisión
    (aceptado o rechazado) junto con su calificación.

    Args:
        pre_enrollment: instancia de PreEnrollment con student__user y program cargados.
        passing_score: calificación mínima aprobatoria (opcional, para mostrar en el email).
    """
    student = pre_enrollment.student
    user_email = student.user.email
    student_name = student.get_full_name()
    program_name = pre_enrollment.program.name
    is_accepted = pre_enrollment.status == 'accepted'

    if is_accepted:
        subject = f'¡Felicidades, fuiste aceptado! — {program_name} — Sistema Universitario'
        header_color = '#16a34a'
        header_title = '🎉 ¡Fuiste Aceptado!'
        result_text = '<strong style="color:#15803d;">ACEPTADO</strong>'
        body_text = (
            f'Nos complace informarte que has sido <strong>aceptado</strong> '
            f'en el programa <strong>{program_name}</strong>. '
            f'Recibirás instrucciones sobre los siguientes pasos para tu inscripción formal.'
        )
        next_steps = """
        <h3 style="color:#1f2937;">¿Qué sigue?</h3>
        <p style="color:#4b5563;">
            Ingresa a tu panel de aspirante para comenzar el proceso de inscripción formal.
            Deberás subir documentos adicionales y realizar el pago de inscripción.
        </p>
        """
    else:
        subject = f'Resultado de examen de admisión — {program_name} — Sistema Universitario'
        header_color = '#dc2626'
        header_title = '📋 Resultado de Examen'
        result_text = '<strong style="color:#dc2626;">NO ACEPTADO</strong>'
        body_text = (
            f'Lamentamos informarte que no alcanzaste la calificación mínima requerida '
            f'para el programa <strong>{program_name}</strong> en este proceso de admisión.'
        )
        next_steps = """
        <p style="color:#4b5563;">
            Te invitamos a continuar preparándote y participar en el próximo proceso
            de admisión. Si tienes dudas, comunícate con Servicios Escolares.
        </p>
        """

    score_section = ''
    if pre_enrollment.exam_score is not None:
        score_color = '#16a34a' if is_accepted else '#dc2626'
        passing_line = (
            f'<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">'
            f'Calificación mínima aprobatoria: {passing_score}</p>'
            if passing_score is not None
            else ''
        )
        score_section = f"""
        <div class="detail-box" style="text-align:center;padding:20px;">
            <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;
                       letter-spacing:.05em;font-weight:600;margin-bottom:8px;">
                Tu Calificación
            </p>
            <p style="margin:0;font-size:48px;font-weight:800;color:{score_color};">
                {pre_enrollment.exam_score}
            </p>
            {passing_line}
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
            <h1 style="margin:0;">{header_title}</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">{program_name}</p>
        </div>

        <div class="content">
            <h2 style="color:#1f2937;">Hola, {student_name}</h2>
            <p style="color:#4b5563;">{body_text}</p>

            <div class="detail-box">
                <p style="margin:0 0 8px;"><strong>Resultado:</strong> {result_text}</p>
                <p style="margin:0;"><strong>Programa:</strong> {program_name}</p>
            </div>

            {score_section}
            {next_steps}

            <div style="text-align:center;">
                <a href="{settings.FRONTEND_URL}/my-application" class="button">
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
        print(f"Error enviando email de resultado de examen: {e}")
        return False
