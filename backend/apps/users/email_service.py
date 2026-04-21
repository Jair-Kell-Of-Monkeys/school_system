"""
Servicio de envío de emails para el sistema universitario.
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


def send_verification_email(user, token):
    """
    Envía email de verificación al nuevo usuario.
    """
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
    
    subject = 'Verifica tu cuenta - Sistema Universitario'
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .button {{ display: inline-block; background-color: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
            .warning {{ background-color: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 13px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin: 0;">🎓 Sistema Universitario</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Verificación de cuenta</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937;">¡Bienvenido!</h2>
            <p style="color: #4b5563;">
                Gracias por registrarte en el Sistema Universitario. 
                Para completar tu registro y acceder a tu cuenta, 
                necesitas verificar tu dirección de correo electrónico.
            </p>
            
            <p style="color: #4b5563;">
                Haz clic en el siguiente botón para verificar tu cuenta:
            </p>
            
            <div style="text-align: center;">
                <a href="{verification_url}" class="button">
                    ✅ Verificar mi cuenta
                </a>
            </div>
            
            <p style="color: #4b5563; font-size: 13px;">
                O copia y pega este enlace en tu navegador:
                <br>
                <span style="color: #2563eb; word-break: break-all;">{verification_url}</span>
            </p>
            
            <div class="warning">
                ⚠️ Este enlace expirará en <strong>24 horas</strong>. 
                Si no verificas tu cuenta antes de ese tiempo, 
                deberás registrarte nuevamente.
            </div>
        </div>
        
        <div class="footer">
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
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
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error enviando email de verificación: {e}")
        return False


def send_password_reset_email(user, token):
    """
    Envía email con enlace para restablecer la contraseña.
    El enlace expira en 1 hora y solo puede usarse una vez.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    subject = 'Restablecer contraseña — Sistema Universitario'

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .button {{ display: inline-block; background-color: #4f46e5; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
            .warning {{ background-color: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 13px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin: 0;">🔑 Sistema Universitario</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Restablecimiento de contraseña</p>
        </div>

        <div class="content">
            <h2 style="color: #1f2937;">Solicitud de restablecimiento</h2>
            <p style="color: #4b5563;">
                Recibimos una solicitud para restablecer la contraseña asociada
                a la cuenta <strong>{user.email}</strong>.
            </p>

            <p style="color: #4b5563;">
                Haz clic en el siguiente botón para crear una nueva contraseña:
            </p>

            <div style="text-align: center;">
                <a href="{reset_url}" class="button">
                    🔒 Restablecer mi contraseña
                </a>
            </div>

            <p style="color: #4b5563; font-size: 13px;">
                O copia y pega este enlace en tu navegador:
                <br>
                <span style="color: #4f46e5; word-break: break-all;">{reset_url}</span>
            </p>

            <div class="warning">
                ⚠️ Este enlace expira en <strong>1 hora</strong> y solo puede usarse una vez.
                Si no solicitaste este cambio, ignora este correo —
                tu contraseña no será modificada.
            </div>
        </div>

        <div class="footer">
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.</p>
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
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error enviando email de restablecimiento: {e}")
        return False


def send_welcome_email(user):
    """
    Envía email de bienvenida después de verificar la cuenta.
    """
    subject = '¡Cuenta verificada! - Sistema Universitario'
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .button {{ display: inline-block; background-color: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }}
            .step {{ display: flex; align-items: flex-start; margin: 15px 0; }}
            .step-number {{ background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin: 0;">🎉 ¡Cuenta Verificada!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Ya puedes acceder al sistema</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937;">¡Todo listo, {user.email}!</h2>
            <p style="color: #4b5563;">
                Tu cuenta ha sido verificada exitosamente. 
                Ahora puedes iniciar sesión y comenzar tu proceso de admisión.
            </p>
            
            <h3 style="color: #1f2937;">Próximos pasos:</h3>
            
            <div class="step">
                <div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">1</div>
                <div>
                    <strong>Inicia sesión</strong> con tu correo y contraseña
                </div>
            </div>
            
            <div class="step">
                <div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">2</div>
                <div>
                    <strong>Crea tu solicitud</strong> seleccionando el programa y periodo de tu interés
                </div>
            </div>
            
            <div class="step">
                <div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">3</div>
                <div>
                    <strong>Sube tus documentos</strong> requeridos para la admisión
                </div>
            </div>
            
            <div class="step">
                <div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">4</div>
                <div>
                    <strong>Envía tu solicitud</strong> y espera la revisión del equipo de admisiones
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="{settings.FRONTEND_URL}/login" class="button">
                    🚀 Iniciar sesión ahora
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
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        return True
    except Exception as e:
        print(f"Error enviando email de bienvenida: {e}")
        return False