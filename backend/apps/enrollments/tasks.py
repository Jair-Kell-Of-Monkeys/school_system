"""
Tareas Celery para notificaciones del módulo de inscripciones.
"""

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_enrollment_accepted_email_task(self, enrollment_id: str) -> bool:
    """
    Notifica al aspirante que fue aceptado e indica subir documentos de inscripción.
    """
    try:
        from apps.enrollments.models import Enrollment
        from apps.enrollments.email_service import send_enrollment_accepted_email

        enrollment = Enrollment.objects.select_related(
            'student__user',
            'program',
            'period',
        ).get(id=enrollment_id)

        return send_enrollment_accepted_email(enrollment)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_enrollment_rejected_email_task(self, pre_enrollment_id: str) -> bool:
    """
    Notifica al aspirante que su solicitud no fue aceptada.
    """
    try:
        from apps.pre_enrollment.models import PreEnrollment
        from apps.enrollments.email_service import send_enrollment_rejected_email

        pre_enrollment = PreEnrollment.objects.select_related(
            'student__user',
            'program',
        ).get(id=pre_enrollment_id)

        return send_enrollment_rejected_email(pre_enrollment)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_enrollment_document_rejected_email_task(
    self,
    document_id: str,
    notes: str = '',
) -> bool:
    """
    Notifica al aspirante que un documento de inscripción fue rechazado.
    """
    try:
        from apps.enrollments.models import EnrollmentDocument
        from apps.enrollments.email_service import send_enrollment_document_rejected_email

        document = EnrollmentDocument.objects.select_related(
            'enrollment__student__user',
            'enrollment__program',
            'reviewed_by',
        ).get(id=document_id)

        return send_enrollment_document_rejected_email(document, notes)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_enrollment_completed_email_task(self, enrollment_id: str) -> bool:
    """
    Felicita al alumno con su matrícula, correo institucional, grupo y horario.
    """
    try:
        from apps.enrollments.models import Enrollment
        from apps.enrollments.email_service import send_enrollment_completed_email

        enrollment = Enrollment.objects.select_related(
            'student__user',
            'program',
            'period',
        ).get(id=enrollment_id)

        return send_enrollment_completed_email(enrollment)
    except Exception as exc:
        raise self.retry(exc=exc)
