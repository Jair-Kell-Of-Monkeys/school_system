# apps/users/tasks.py
"""
Tareas Celery para envío asíncrono de emails de usuario.
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email_task(self, user_email: str, token_value: str) -> bool:
    """
    Envía el email de verificación de cuenta de forma asíncrona.

    Args:
        user_email: Email del usuario destinatario.
        token_value: Valor del token de verificación.
    """
    try:
        from apps.users.models import User, EmailVerificationToken
        from apps.users.email_service import send_verification_email

        user = User.objects.get(email=user_email)
        token = EmailVerificationToken.objects.get(token=token_value)
        return send_verification_email(user, token)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, user_email: str, token_value: str) -> bool:
    """
    Envía el email de restablecimiento de contraseña de forma asíncrona.

    Args:
        user_email: Email del usuario destinatario.
        token_value: Valor del token de restablecimiento.
    """
    try:
        from apps.users.models import User, PasswordResetToken
        from apps.users.email_service import send_password_reset_email

        user = User.objects.get(email=user_email)
        token = PasswordResetToken.objects.get(token=token_value)
        return send_password_reset_email(user, token.token)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email_task(self, user_email: str) -> bool:
    """
    Envía el email de bienvenida después de verificar la cuenta.

    Args:
        user_email: Email del usuario.
    """
    try:
        from apps.users.models import User
        from apps.users.email_service import send_welcome_email

        user = User.objects.get(email=user_email)
        return send_welcome_email(user)
    except Exception as exc:
        raise self.retry(exc=exc)
