# apps/academic/models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class AcademicPeriod(models.Model):
    """
    Periodos académicos (cuatrimestres/semestres)
    """
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Nombre',
        help_text='Ej: 2026-A, 2026-B'
    )
    start_date = models.DateField(
        verbose_name='Fecha de Inicio'
    )
    end_date = models.DateField(
        verbose_name='Fecha de Fin'
    )
    enrollment_start = models.DateField(
        verbose_name='Inicio de Inscripciones'
    )
    enrollment_end = models.DateField(
        verbose_name='Fin de Inscripciones'
    )
    is_active = models.BooleanField(
        default=False,
        verbose_name='Activo',
        help_text='Solo un periodo puede estar activo a la vez'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Actualizado'
    )
    
    class Meta:
        db_table = 'academic_periods'
        verbose_name = 'Periodo Académico'
        verbose_name_plural = 'Periodos Académicos'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
    
    def clean(self):
        """Validaciones del modelo"""
        # Validar que end_date sea después de start_date
        if self.end_date and self.start_date:
            if self.end_date <= self.start_date:
                raise ValidationError({
                    'end_date': 'La fecha de fin debe ser posterior a la fecha de inicio'
                })
        
        # Validar que enrollment_end sea después de enrollment_start
        if self.enrollment_end and self.enrollment_start:
            if self.enrollment_end <= self.enrollment_start:
                raise ValidationError({
                    'enrollment_end': 'La fecha de fin de inscripciones debe ser posterior al inicio'
                })
        
        # Si se marca como activo, desactivar los demás
        if self.is_active:
            # Excluir el registro actual si ya existe
            queryset = AcademicPeriod.objects.filter(is_active=True)
            if self.pk:
                queryset = queryset.exclude(pk=self.pk)
            
            if queryset.exists():
                raise ValidationError({
                    'is_active': 'Ya existe un periodo activo. Desactívalo primero.'
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_enrollment_open(self):
        """Verifica si las inscripciones están abiertas"""
        today = timezone.now().date()
        return self.enrollment_start <= today <= self.enrollment_end
    
    @property
    def is_current(self):
        """Verifica si el periodo está en curso"""
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date
    
    @property
    def duration_days(self):
        """Duración del periodo en días"""
        return (self.end_date - self.start_date).days


class AcademicProgram(models.Model):
    """
    Carreras/Programas académicos disponibles
    """
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(
        max_length=255,
        verbose_name='Nombre del Programa'
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        verbose_name='Código',
        help_text='Ej: ISC, LA, TICS'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción'
    )
    duration = models.IntegerField(
        verbose_name='Duración',
        help_text='Duración en cuatrimestres/semestres'
    )
    max_capacity = models.IntegerField(
        default=30,
        verbose_name='Capacidad Máxima',
        help_text='Capacidad máxima por generación'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Actualizado'
    )
    
    class Meta:
        db_table = 'academic_programs'
        verbose_name = 'Programa Académico'
        verbose_name_plural = 'Programas Académicos'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def clean(self):
        """Validaciones del modelo"""
        if self.duration and self.duration <= 0:
            raise ValidationError({
                'duration': 'La duración debe ser mayor a 0'
            })
        
        if self.max_capacity and self.max_capacity <= 0:
            raise ValidationError({
                'max_capacity': 'La capacidad máxima debe ser mayor a 0'
            })
        
        # Convertir código a mayúsculas
        if self.code:
            self.code = self.code.upper()
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def get_available_capacity(self, period):
        """
        Obtiene la capacidad disponible para un periodo específico
        """
        from apps.enrollments.models import Enrollment
        
        enrolled_count = Enrollment.objects.filter(
            program=self,
            period=period,
            status__in=['enrolled', 'active']
        ).count()
        
        return self.max_capacity - enrolled_count
    
    def has_capacity(self, period):
        """
        Verifica si hay cupo disponible en un periodo
        """
        return self.get_available_capacity(period) > 0