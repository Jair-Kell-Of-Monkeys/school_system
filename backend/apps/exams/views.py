# apps/exams/views.py
import logging
from datetime import datetime, timezone as dt_tz

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import ExamSession, ExamVenue
from .serializers import (
    ExamSessionListSerializer,
    ExamSessionDetailSerializer,
    ExamSessionCreateSerializer,
    GradeSerializer,
    ExamAspirantSerializer,
)
from .permissions import IsJefeServicios, IsEncargadoServicios
from apps.pre_enrollment.models import PreEnrollment

logger = logging.getLogger(__name__)


class ExamSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar sesiones de examen de admisión.

    Endpoints:
      GET    /api/exams/sessions/                               - listar sesiones
      POST   /api/exams/sessions/                               - crear con venues
      GET    /api/exams/sessions/{id}/                          - detalle con venues
      POST   /api/exams/sessions/{id}/publish/                  - publicar (dispara asignación)
      GET    /api/exams/sessions/{id}/aspirants/                - lista para calificación
      POST   /api/exams/sessions/{id}/grade/{pre_enrollment_id}/ - calificar aspirante
      GET    /api/exams/sessions/aspirant-counts/?period=<id>   - conteo por programa
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    parser_classes = [JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'period']
    search_fields = ['name']
    ordering_fields = ['exam_date', 'created_at']
    ordering = ['-exam_date']

    def get_queryset(self):
        return ExamSession.objects.select_related(
            'period', 'created_by'
        ).prefetch_related('venues__program').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return ExamSessionListSerializer
        return ExamSessionDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'publish']:
            return [IsJefeServicios()]
        if self.action in ['aspirants', 'grade', 'aspirant_counts']:
            return [IsEncargadoServicios()]
        return super().get_permissions()

    # ── CREATE ────────────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        """
        POST /api/exams/sessions/
        Body: { name, period, exam_date, exam_time, mode, passing_score,
                venues: [{program, building, room, capacity}, ...] }
        """
        serializer = ExamSessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = ExamSession.objects.create(
            name=data['name'],
            period=data['period'],
            exam_date=data['exam_date'],
            exam_time=data['exam_time'],
            mode=data['mode'],
            passing_score=data['passing_score'],
            status='draft',
            created_by=request.user,
        )

        for venue_data in data['venues']:
            ExamVenue.objects.create(
                exam_session=session,
                program=venue_data['program'],
                building=venue_data['building'],
                room=venue_data['room'],
                capacity=venue_data['capacity'],
            )

        response_serializer = ExamSessionDetailSerializer(
            session, context={'request': request}
        )
        logger.info(
            '[ExamSessionViewSet.create] Session created: %s by %s',
            session.name, request.user.email,
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    # Disable PUT/PATCH/DELETE — sessions are immutable after creation
    def update(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las sesiones de examen no se pueden modificar.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las sesiones de examen no se pueden modificar.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las sesiones de examen no se pueden eliminar.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    # ── PUBLISH ───────────────────────────────────────────────────────────────

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsJefeServicios],
        url_path='publish',
    )
    def publish(self, request, pk=None):
        """
        POST /api/exams/sessions/{id}/publish/

        Valida capacidad por programa vs. aspirantes con payment_validated,
        publica la sesión y dispara assign_exam_task en segundo plano.
        Devuelve HTTP 400 si hay déficit de capacidad.
        """
        session = self.get_object()

        if not session.is_mutable():
            return Response(
                {
                    'error': (
                        f"La sesión ya está en estado '{session.get_status_display()}' "
                        f"y no puede publicarse nuevamente."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        venues = list(session.venues.select_related('program').all())
        if not venues:
            return Response(
                {'error': 'La sesión no tiene salones configurados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate capacity per program
        capacity_by_program: dict[int, int] = {}
        program_by_id: dict[int, object] = {}
        for venue in venues:
            pid = venue.program_id
            capacity_by_program[pid] = capacity_by_program.get(pid, 0) + venue.capacity
            program_by_id[pid] = venue.program

        # Check aspirant count per program
        deficits = []
        for program_id, total_cap in capacity_by_program.items():
            aspirant_count = PreEnrollment.objects.filter(
                period=session.period,
                program_id=program_id,
                status='payment_validated',
            ).count()
            if aspirant_count > total_cap:
                prog = program_by_id[program_id]
                deficits.append({
                    'program': prog.code,
                    'program_name': prog.name,
                    'aspirants': aspirant_count,
                    'capacity': total_cap,
                    'deficit': aspirant_count - total_cap,
                })

        if deficits:
            return Response(
                {
                    'error': 'Capacidad insuficiente para uno o más programas.',
                    'deficits': deficits,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.status = 'published'
        session.save(update_fields=['status', 'updated_at'])

        logger.info(
            '[ExamSessionViewSet.publish] Session %s published by %s',
            session.name, request.user.email,
        )

        # Trigger async assignment (Celery), fallback to sync if unavailable
        try:
            from apps.exams.tasks import assign_exam_task
            assign_exam_task.delay(str(session.id))
        except Exception as exc:
            logger.warning(
                '[ExamSessionViewSet.publish] Celery not available (%s), running sync.', exc
            )
            try:
                from apps.exams.tasks import assign_exam_task as sync_task
                sync_task(str(session.id))
            except Exception as sync_exc:
                logger.error(
                    '[ExamSessionViewSet.publish] Sync fallback failed: %s', sync_exc
                )

        return Response({
            'message': (
                'El examen está siendo publicado en segundo plano. '
                'Los aspirantes recibirán su asignación por correo electrónico.'
            ),
            'session_id': str(session.id),
        })

    # ── ASPIRANTS ─────────────────────────────────────────────────────────────

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[IsEncargadoServicios],
        url_path='aspirants',
    )
    def aspirants(self, request, pk=None):
        """
        GET /api/exams/sessions/{id}/aspirants/

        Lista pre-inscripciones asignadas a esta sesión.
        servicios_escolares solo ve los de sus programas asignados.
        """
        session = self.get_object()

        venue_programs = list(session.venues.values_list('program_id', flat=True))
        exam_datetime = datetime.combine(
            session.exam_date, session.exam_time
        ).replace(tzinfo=dt_tz.utc)
        qs = (
            PreEnrollment.objects.select_related(
                'student', 'student__user', 'program', 'period',
            )
            .filter(
                period=session.period,
                program_id__in=venue_programs,
                exam_date=exam_datetime,
            )
        )

        user = request.user
        if user.role == 'servicios_escolares':
            program_ids = list(
                user.get_accessible_programs().values_list('id', flat=True)
            )
            qs = qs.filter(program_id__in=program_ids)

        qs = qs.order_by('program__code', 'student__last_name', 'student__first_name')

        serializer = ExamAspirantSerializer(qs, many=True)
        return Response(serializer.data)

    # ── GRADE ─────────────────────────────────────────────────────────────────

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsEncargadoServicios],
        url_path=r'grade/(?P<pre_enrollment_id>[^/.]+)',
    )
    def grade(self, request, pk=None, pre_enrollment_id=None):
        """
        POST /api/exams/sessions/{id}/grade/{pre_enrollment_id}/
        Body: { "attended": true, "exam_score": 85.5 }
          or: { "attended": false }

        Si el aspirante asistió y aprueba → status=accepted + crea Enrollment.
        Si no asistió o reprueba → status=rejected.
        Siempre dispara send_exam_result_email_task.
        """
        session = self.get_object()

        venue_programs = list(session.venues.values_list('program_id', flat=True))
        try:
            pre_enrollment = PreEnrollment.objects.select_related(
                'student', 'student__user', 'program', 'period',
            ).get(pk=pre_enrollment_id, period=session.period, program_id__in=venue_programs)
        except PreEnrollment.DoesNotExist:
            return Response(
                {'error': 'Aspirante no encontrado en esta sesión de examen.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if pre_enrollment.status != 'exam_scheduled':
            return Response(
                {
                    'error': (
                        f"La pre-inscripción debe estar en estado 'exam_scheduled', "
                        f"estado actual: '{pre_enrollment.status}'"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Program access check for servicios_escolares
        user = request.user
        if user.role == 'servicios_escolares':
            accessible_ids = list(
                user.get_accessible_programs().values_list('id', flat=True)
            )
            if pre_enrollment.program_id not in accessible_ids:
                return Response(
                    {'error': 'No tiene permiso para calificar aspirantes de este programa.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        grade_serializer = GradeSerializer(data=request.data)
        grade_serializer.is_valid(raise_exception=True)
        attended = grade_serializer.validated_data['attended']
        exam_score = grade_serializer.validated_data.get('exam_score')

        with transaction.atomic():
            pre_enrollment.exam_completed_at = timezone.now()

            if not attended:
                pre_enrollment.exam_score = None
                pre_enrollment.status = 'rejected'
                pre_enrollment.save(
                    update_fields=['status', 'exam_score', 'exam_completed_at', 'updated_at']
                )
            else:
                pre_enrollment.exam_score = exam_score
                pre_enrollment.save(
                    update_fields=['exam_score', 'exam_completed_at', 'updated_at']
                )

                passing = session.passing_score
                if exam_score >= passing:
                    pre_enrollment.status = 'accepted'
                    pre_enrollment.save(update_fields=['status', 'updated_at'])

                    # Create formal Enrollment if it doesn't exist yet
                    try:
                        from apps.enrollments.models import Enrollment
                        from apps.enrollments.generators import (
                            generate_matricula,
                            generate_institutional_email,
                        )

                        if not Enrollment.objects.filter(
                            pre_enrollment=pre_enrollment
                        ).exists():
                            student = pre_enrollment.student
                            program = pre_enrollment.program
                            period = pre_enrollment.period

                            matricula = generate_matricula(
                                program_code=program.code,
                                period_year=str(period.start_date.year),
                            )

                            if not student.institutional_email:
                                inst_email = generate_institutional_email(student)
                                student.institutional_email = inst_email
                                student.save(update_fields=['institutional_email'])

                            enrollment = Enrollment(
                                student=student,
                                program=program,
                                period=period,
                                pre_enrollment=pre_enrollment,
                                matricula=matricula,
                                status='pending_docs',
                                enrolled_at=timezone.now(),
                            )
                            enrollment.save()

                            logger.info(
                                '[grade] Enrollment created: matricula=%s student=%s',
                                matricula, student.pk,
                            )
                    except Exception as exc:
                        logger.error('[grade] Error creating enrollment: %s', exc)
                else:
                    pre_enrollment.status = 'rejected'
                    pre_enrollment.save(update_fields=['status', 'updated_at'])

        # Send result email (async, sync fallback)
        try:
            from apps.exams.tasks import send_exam_result_email_task
            send_exam_result_email_task.delay(str(pre_enrollment.pk), str(session.id))
        except Exception:
            try:
                from apps.exams.email_service import send_exam_result_email
                send_exam_result_email(pre_enrollment, passing_score=session.passing_score)
            except Exception as email_exc:
                logger.error('[grade] Error sending result email: %s', email_exc)

        final_status = pre_enrollment.status
        return Response({
            'message': (
                'Aspirante aceptado correctamente.'
                if final_status == 'accepted'
                else 'Aspirante no aceptado.'
            ),
            'status': final_status,
            'exam_score': str(exam_score) if exam_score is not None else None,
        })

    # ── ASPIRANT COUNTS ───────────────────────────────────────────────────────

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[IsJefeServicios],
        url_path='aspirant-counts',
    )
    def aspirant_counts(self, request):
        """
        GET /api/exams/sessions/aspirant-counts/?period=<id>

        Devuelve el número de aspirantes con payment_validated por programa
        para el periodo indicado. Usado en el formulario de creación para el
        contador en tiempo real.
        """
        period_id = request.query_params.get('period')
        if not period_id:
            return Response(
                {'error': 'Se requiere el parámetro period.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.academic.models import AcademicProgram

        programs = AcademicProgram.objects.filter(is_active=True).order_by('code')
        result = []
        for program in programs:
            count = PreEnrollment.objects.filter(
                period_id=period_id,
                program=program,
                status='payment_validated',
            ).count()
            if count > 0:
                result.append({
                    'program_id': program.id,
                    'program_code': program.code,
                    'program_name': program.name,
                    'aspirant_count': count,
                })

        return Response(result)
