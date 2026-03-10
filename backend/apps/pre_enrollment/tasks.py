"""
Tareas Celery para notificaciones de pre-inscripción.
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_all_documents_approved_email_task(self, pre_enrollment_id: str) -> bool:
    """
    Notifica al aspirante que todos sus documentos han sido aprobados
    y su solicitud avanza al siguiente paso.

    Args:
        pre_enrollment_id: UUID de la pre-inscripción.
    """
    try:
        from apps.pre_enrollment.models import PreEnrollment
        from apps.pre_enrollment.email_service import send_all_documents_approved_email

        pre_enrollment = PreEnrollment.objects.select_related(
            'student__user',
            'program',
            'period',
        ).get(id=pre_enrollment_id)

        return send_all_documents_approved_email(pre_enrollment)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_document_review_email_task(
    self,
    document_id: str,
    action: str,
    reviewer_notes: str = '',
) -> bool:
    """
    Envía al aspirante la notificación de aprobación o rechazo de su documento.

    Args:
        document_id: UUID del documento revisado.
        action: 'approve' o 'reject'.
        reviewer_notes: Observación opcional del encargado.
    """
    try:
        from apps.pre_enrollment.models import Document
        from apps.pre_enrollment.email_service import send_document_review_email

        document = Document.objects.select_related(
            'pre_enrollment__student__user',
            'pre_enrollment__program',
            'reviewed_by',
        ).get(id=document_id)

        return send_document_review_email(document, action, reviewer_notes)
    except Exception as exc:
        raise self.retry(exc=exc)
