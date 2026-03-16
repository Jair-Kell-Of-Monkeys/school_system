# apps/exams/models.py
import uuid
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from apps.academic.models import AcademicPeriod, AcademicProgram
from apps.users.models import User


class ExamSession(models.Model):
    """
    Sesión de examen de admisión vinculada a un periodo académico.
    El Jefe de Servicios Escolares la crea con sus sedes (ExamVenue).
    Una vez publicada es de solo lectura; el task assign_exam_task
    asigna automáticamente los aspirantes a las sedes.
    """

    STATUS_CHOICES = [
        ('draft', 'Borrador'),
        ('published', 'Publicado'),
        ('completed', 'Completado'),
    ]
    MODE_CHOICES = [
        ('presencial', 'Presencial'),
        ('en_linea', 'En Línea'),
    ]
    EXAM_TYPE_CHOICES = [
        ('propio', 'Propio'),
        ('cenaval', 'CENAVAL'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name='Nombre')
    period = models.ForeignKey(
        AcademicPeriod,
        on_delete=models.PROTECT,
        related_name='exam_sessions',
        verbose_name='Periodo',
        db_constraint=False,
    )
    exam_date = models.DateField(verbose_name='Fecha del Examen')
    exam_time = models.TimeField(verbose_name='Hora del Examen')
    mode = models.CharField(
        max_length=20,
        choices=MODE_CHOICES,
        default='presencial',
        verbose_name='Modalidad',
    )
    exam_type = models.CharField(
        max_length=20,
        choices=EXAM_TYPE_CHOICES,
        default='propio',
        verbose_name='Tipo de Examen',
    )
    passing_score = models.IntegerField(
        default=70,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Calificación Mínima Aprobatoria',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Estado',
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_exam_sessions',
        verbose_name='Creado por',
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        db_table = 'exam_sessions'
        verbose_name = 'Sesión de Examen'
        verbose_name_plural = 'Sesiones de Examen'
        ordering = ['-exam_date']
        indexes = [
            models.Index(fields=['period'], name='exam_session_period_idx'),
            models.Index(fields=['status'], name='exam_session_status_idx'),
            models.Index(fields=['exam_date'], name='exam_session_date_idx'),
        ]

    def __str__(self):
        return self.name

    def is_mutable(self):
        """Solo modificable en estado borrador."""
        return self.status == 'draft'

    @property
    def total_capacity(self):
        return sum(v.capacity for v in self.venues.all())


class ExamVenue(models.Model):
    """
    Sede (edificio + salón) de un ExamSession para un programa dado.
    Determina la capacidad de aspirantes por salón.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_session = models.ForeignKey(
        ExamSession,
        on_delete=models.CASCADE,
        related_name='venues',
        verbose_name='Sesión de Examen',
    )
    program = models.ForeignKey(
        AcademicProgram,
        on_delete=models.PROTECT,
        related_name='exam_venues',
        verbose_name='Programa',
        db_constraint=False,
    )
    building = models.CharField(max_length=100, verbose_name='Edificio')
    room = models.CharField(max_length=100, verbose_name='Salón')
    capacity = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Capacidad',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        db_table = 'exam_venues'
        verbose_name = 'Sede de Examen'
        verbose_name_plural = 'Sedes de Examen'
        ordering = ['program', 'building', 'room']
        indexes = [
            models.Index(fields=['exam_session'], name='exam_venue_session_idx'),
            models.Index(fields=['program'], name='exam_venue_program_idx'),
        ]

    def __str__(self):
        return f"{self.program.code} — Edificio {self.building} Salón {self.room}"

    @property
    def location_display(self):
        return f"Edificio {self.building} - Salón {self.room}"
