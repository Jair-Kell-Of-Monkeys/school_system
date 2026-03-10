"""
Tareas Celery para notificaciones del módulo de pagos.
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_payment_rejected_email_task(self, payment_id: str) -> bool:
    """
    Notifica al aspirante que su comprobante de pago fue rechazado.

    Args:
        payment_id: UUID del pago rechazado.
    """
    try:
        from apps.payments.models import Payment
        from apps.payments.email_service import send_payment_rejected_email

        payment = Payment.objects.select_related(
            'pre_enrollment__student__user',
            'pre_enrollment__program',
            'validated_by',
        ).get(id=payment_id)

        return send_payment_rejected_email(payment)
    except Exception as exc:
        raise self.retry(exc=exc)
