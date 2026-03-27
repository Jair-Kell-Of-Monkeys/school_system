"""
Tareas Celery para el módulo de exámenes de admisión.
"""
import logging
from datetime import datetime, timezone as dt_tz
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def assign_exam_task(self, exam_session_id: str) -> dict:
    """
    Asigna aspirantes con payment_validated a los salones del examen.

    Idempotente: solo procesa pre-inscripciones con exam_date=null.
    Ordena por created_at (primero en llegar, primero asignado) y llena
    cada venue hasta su capacity antes de pasar al siguiente.
    """
    try:
        from apps.exams.models import ExamSession
        from apps.pre_enrollment.models import PreEnrollment

        session = ExamSession.objects.select_related('period').prefetch_related(
            'venues__program'
        ).get(id=exam_session_id)

        # Combinar fecha + hora sin conversión de zona horaria.
        # Se marca como UTC para que el ORM lo acepte con USE_TZ=True,
        # pero el valor en sí ya representa la hora local tal como la ingresó
        # la jefa (el serializador usa DATETIME_FORMAT sin sufijo de zona).
        exam_datetime = datetime.combine(
            session.exam_date, session.exam_time
        ).replace(tzinfo=dt_tz.utc)

        assigned_count = 0

        for venue in session.venues.select_related('program').order_by('created_at'):
            location_display = f"Edificio {venue.building} - Salón {venue.room}"

            # Get unassigned aspirants for this program/period, ordered by signup time
            aspirants = list(
                PreEnrollment.objects.select_related('student__user', 'program', 'period')
                .filter(
                    period=session.period,
                    program=venue.program,
                    status='payment_validated',
                    exam_date__isnull=True,   # idempotency guard
                )
                .order_by('created_at')[: venue.capacity]
            )

            for pre_enrollment in aspirants:
                # Re-check idempotency at the row level
                updated = PreEnrollment.objects.filter(
                    pk=pre_enrollment.pk,
                    exam_date__isnull=True,
                ).update(
                    exam_date=exam_datetime,
                    exam_mode=session.mode,
                    exam_location=location_display,
                    status='exam_scheduled',
                )
                if not updated:
                    # Another worker already assigned this aspirant
                    continue

                assigned_count += 1

                # Send notification email (async, with sync fallback)
                try:
                    send_exam_assigned_email_task.delay(str(pre_enrollment.pk))
                except Exception:
                    from apps.exams.email_service import send_exam_assigned_email
                    pre_enrollment.refresh_from_db()
                    send_exam_assigned_email(pre_enrollment)

        logger.info(
            '[assign_exam_task] Session %s: assigned=%s',
            exam_session_id,
            assigned_count,
        )
        return {'assigned': assigned_count}

    except Exception as exc:
        logger.error('[assign_exam_task] Error processing session %s: %s', exam_session_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_exam_assigned_email_task(self, pre_enrollment_id: str) -> bool:
    """Envía email de asignación de examen a un aspirante."""
    try:
        from apps.pre_enrollment.models import PreEnrollment
        from apps.exams.email_service import send_exam_assigned_email

        pre_enrollment = PreEnrollment.objects.select_related(
            'student__user', 'program', 'period'
        ).get(id=pre_enrollment_id)

        return send_exam_assigned_email(pre_enrollment)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_exam_result_email_task(
    self,
    pre_enrollment_id: str,
    session_id: str = None,
    rejection_reason: str = None,
) -> bool:
    """Envía email con el resultado del examen de admisión."""
    try:
        from apps.pre_enrollment.models import PreEnrollment
        from apps.exams.email_service import send_exam_result_email

        pre_enrollment = PreEnrollment.objects.select_related(
            'student__user', 'program', 'period',
        ).get(id=pre_enrollment_id)

        passing_score = None
        if session_id:
            from apps.exams.models import ExamSession
            try:
                session = ExamSession.objects.get(id=session_id)
                passing_score = session.passing_score
            except ExamSession.DoesNotExist:
                pass

        return send_exam_result_email(
            pre_enrollment,
            passing_score=passing_score,
            rejection_reason=rejection_reason,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
