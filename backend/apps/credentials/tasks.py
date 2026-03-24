# apps/credentials/tasks.py
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_credential_request_received_email_task(self, credential_request_id: str):
    from apps.credentials.models import CredentialRequest
    from apps.credentials.email_service import send_credential_request_received_email
    try:
        req = CredentialRequest.objects.select_related(
            'enrollment__student__user',
            'enrollment__program',
            'enrollment__period',
            'convocatoria',
        ).get(pk=credential_request_id)
        send_credential_request_received_email(req)
    except CredentialRequest.DoesNotExist:
        logger.warning('[task] CredentialRequest %s not found', credential_request_id)
    except Exception as exc:
        logger.error('[task] Error enviando email solicitud recibida: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_credential_approved_email_task(self, credential_request_id: str):
    from apps.credentials.models import CredentialRequest
    from apps.credentials.email_service import send_credential_approved_email
    try:
        req = CredentialRequest.objects.select_related(
            'enrollment__student__user',
            'enrollment__program',
            'enrollment__period',
        ).get(pk=credential_request_id)
        send_credential_approved_email(req)
    except CredentialRequest.DoesNotExist:
        logger.warning('[task] CredentialRequest %s not found', credential_request_id)
    except Exception as exc:
        logger.error('[task] Error enviando email credencial aprobada: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_credential_rejected_email_task(self, credential_request_id: str):
    from apps.credentials.models import CredentialRequest
    from apps.credentials.email_service import send_credential_rejected_email
    try:
        req = CredentialRequest.objects.select_related(
            'enrollment__student__user',
            'enrollment__program',
            'enrollment__period',
        ).get(pk=credential_request_id)
        send_credential_rejected_email(req)
    except CredentialRequest.DoesNotExist:
        logger.warning('[task] CredentialRequest %s not found', credential_request_id)
    except Exception as exc:
        logger.error('[task] Error enviando email credencial rechazada: %s', exc)
        raise self.retry(exc=exc)
