# apps/students/models.py
import uuid
from django.db import models
from django.core.validators import RegexValidator
from apps.users.models import User


class Student(models.Model):
    """
    Modelo para estudiantes del sistema universitario
    Datos personales de aspirantes y alumnos
    """
    
    GENDER_CHOICES = [
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
        ('otro', 'Otro'),
        ('prefiero_no_decir', 'Prefiero no decir'),
    ]
    
    EDUCATION_LEVEL_CHOICES = [
        ('secundaria', 'Secundaria'),
        ('preparatoria', 'Preparatoria'),
        ('bachillerato', 'Bachillerato'),
        ('tecnico', 'Técnico'),
        ('universidad', 'Universidad'),
        ('otro', 'Otro'),
    ]
    
    PHOTO_STATUS_CHOICES = [
        ('pending', 'Pendiente de revisión'),
        ('approved', 'Aprobada'),
        ('rejected', 'Rechazada'),
    ]
    
    # Identificadores
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile',
        verbose_name='Usuario'
    )
    
    # Datos personales básicos
    first_name = models.CharField(
        max_length=100,
        verbose_name='Nombre(s)'
    )
    last_name = models.CharField(
        max_length=100,
        verbose_name='Apellido Paterno'
    )
    second_last_name = models.CharField( 
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Apellido Materno'
    )
    curp = models.CharField(
        max_length=18,
        unique=True,
        verbose_name='CURP',
        validators=[
            RegexValidator(
                regex=r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$',
                message='CURP inválido. Formato: 4 letras, 6 dígitos, H/M, 5 letras, 1 alfanumérico, 1 dígito'
            )
        ]
    )
    date_of_birth = models.DateField(
        verbose_name='Fecha de Nacimiento'
    )
    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        verbose_name='Género'
    )
    
    # Contacto
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Teléfono'
    )
    email = models.EmailField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Email Personal',
        help_text='Email personal (puede diferir del email de usuario)'
    )
    institutional_email = models.EmailField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        verbose_name='Email Institucional',
        help_text='Asignado en inscripción'
    )
    
    # Dirección actual
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name='Dirección'
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Ciudad'
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Estado'
    )
    zip_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name='Código Postal'
    )
    
    # Escuela de procedencia
    previous_school_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Escuela de Procedencia'
    )
    previous_school_city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Ciudad de la Escuela'
    )
    previous_school_state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Estado de la Escuela'
    )
    education_level = models.CharField(
        max_length=50,
        choices=EDUCATION_LEVEL_CHOICES,
        blank=True,
        null=True,
        verbose_name='Nivel Educativo'
    )
    graduation_year = models.IntegerField(
        blank=True,
        null=True,
        verbose_name='Año de Graduación'
    )
    
    # Fotografía
    photo = models.ImageField(
        upload_to='students/photos/%Y/%m/',
        blank=True,
        null=True,
        verbose_name='Fotografía',
        help_text='Fotografía para credencial'
    )
    photo_status = models.CharField(
        max_length=50,
        choices=PHOTO_STATUS_CHOICES,
        default='pending',
        verbose_name='Estado de la Fotografía'
    )
    photo_reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='reviewed_photos',
        verbose_name='Revisado por'
    )
    photo_reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Revisión'
    )
    photo_rejection_reason = models.TextField(
        blank=True,
        null=True,
        verbose_name='Motivo de Rechazo'
    )
    
    # Auditoría
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Actualizado'
    )
    
    class Meta:
        db_table = 'students'
        verbose_name = 'Estudiante'
        verbose_name_plural = 'Estudiantes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['curp']),
            models.Index(fields=['first_name', 'last_name']),
            models.Index(fields=['institutional_email']),
            models.Index(fields=['photo_status']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} - {self.curp}"
    
    def get_full_name(self):
        """Retorna el nombre completo del estudiante"""
        return " ".join(filter(None, [self.first_name, self.last_name, self.second_last_name]))
    
    def get_complete_address(self):
        """Retorna la dirección completa"""
        parts = []
        if self.address:
            parts.append(self.address)
        if self.city:
            parts.append(self.city)
        if self.state:
            parts.append(self.state)
        if self.zip_code:
            parts.append(f"C.P. {self.zip_code}")
        return ", ".join(parts) if parts else "Sin dirección registrada"
    
    def can_approve_photo(self):
        """Verifica si la foto puede ser aprobada"""
        return self.photo and self.photo_status == 'pending'