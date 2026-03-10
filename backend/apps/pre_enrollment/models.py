# apps/pre_enrollment/models.py
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.students.models import Student
from apps.academic.models import AcademicPeriod, AcademicProgram
from apps.users.models import User


class PreEnrollment(models.Model):
    """
    Solicitudes de pre-inscripción (aspirantes)
    """
    
    STATUS_CHOICES = [
        ('draft', 'Borrador'),
        ('submitted', 'Enviado'),
        ('under_review', 'En Revisión'),
        ('documents_rejected', 'Documentos Rechazados'),
        ('documents_approved', 'Documentos Aprobados'),
        ('payment_pending', 'Pago Pendiente'),
        ('payment_submitted', 'Pago Enviado'),
        ('payment_validated', 'Pago Validado'),
        ('exam_scheduled', 'Examen Programado'),
        ('exam_completed', 'Examen Realizado'),
        ('accepted', 'Aceptado'),
        ('rejected', 'Rechazado'),
        ('cancelled', 'Cancelado'),
    ]
    
    EXAM_MODE_CHOICES = [
        ('presencial', 'Presencial'),
        ('en_linea', 'En Línea'),
    ]
    
    # Identificadores
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Relaciones
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='pre_enrollments',
        verbose_name='Estudiante'
    )
    program = models.ForeignKey(
        AcademicProgram,
        on_delete=models.PROTECT,
        related_name='pre_enrollments',
        verbose_name='Programa'
    )
    period = models.ForeignKey(
        AcademicPeriod,
        on_delete=models.PROTECT,
        related_name='pre_enrollments',
        verbose_name='Periodo'
    )
    
    # Estado del flujo
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Estado'
    )
    
    # Información del examen
    exam_date = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha del Examen'
    )
    exam_mode = models.CharField(
        max_length=20,
        choices=EXAM_MODE_CHOICES,
        blank=True,
        null=True,
        verbose_name='Modalidad del Examen'
    )
    exam_location = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Ubicación del Examen',
        help_text='Aula física o URL de reunión'
    )
    exam_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name='Calificación del Examen'
    )
    exam_completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Realización del Examen'
    )
    
    # Auditoría de proceso
    submitted_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Envío'
    )
    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Revisión'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='reviewed_pre_enrollments',
        verbose_name='Revisado por'
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Aprobación/Rechazo'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='approved_pre_enrollments',
        verbose_name='Aprobado/Rechazado por'
    )
    
    # Notas generales
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notas',
        help_text='Notas internas de Servicios Escolares'
    )
    
    # Auditoría general
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Actualizado'
    )
    
    class Meta:
        db_table = 'pre_enrollments'
        verbose_name = 'Pre-inscripción'
        verbose_name_plural = 'Pre-inscripciones'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'period'],
                name='unique_student_period'
            )
        ]
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['program']),
            models.Index(fields=['period']),
            models.Index(fields=['status']),
            models.Index(fields=['submitted_at']),
            models.Index(fields=['exam_date']),
        ]
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.program.code} - {self.period.name}"
    
    def clean(self):
        """Validaciones del modelo"""
        # Validar calificación
        if self.exam_score is not None:
            if self.exam_score < 0 or self.exam_score > 100:
                raise ValidationError({
                    'exam_score': 'La calificación debe estar entre 0 y 100'
                })
        
        # Validar que no exista otra pre-inscripción para el mismo estudiante y periodo
        if not self.pk:  # Solo en creación
            existing = PreEnrollment.objects.filter(
                student=self.student,
                period=self.period
            ).exists()
            if existing:
                raise ValidationError(
                    'Ya existe una pre-inscripción para este estudiante en este periodo'
                )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def can_submit(self):
        """Verifica si puede enviarse la solicitud"""
        return self.status == 'draft'
    
    def can_review(self):
        """Verifica si puede revisarse"""
        return self.status == 'submitted'
    
    def can_schedule_exam(self):
        """Verifica si puede programarse el examen"""
        return self.status == 'payment_validated'
    
    def can_enter_score(self):
        """Verifica si puede ingresarse la calificación"""
        return self.status == 'exam_completed'
    
    def is_approved(self):
        """Verifica si fue aprobado"""
        return self.status == 'accepted'
    
    def is_rejected(self):
        """Verifica si fue rechazado"""
        return self.status == 'rejected'
    
    @property
    def has_all_documents(self):
        """Verifica si tiene todos los documentos requeridos"""
        required_docs = [
            'acta_nacimiento',
            'curp',
            'comprobante_domicilio',
            'certificado_estudios',
            'fotografia',
        ]
        uploaded_docs = self.documents.values_list('document_type', flat=True)
        return all(doc in uploaded_docs for doc in required_docs)
    
    @property
    def has_payment(self):
        """Verifica si tiene pago registrado"""
        return self.payments.filter(payment_type='examen_admision').exists()


class Document(models.Model):
    """
    Documentos digitalizados subidos por aspirantes
    """
    
    DOCUMENT_TYPE_CHOICES = [
        ('acta_nacimiento', 'Acta de Nacimiento'),
        ('curp', 'CURP'),
        ('comprobante_domicilio', 'Comprobante de Domicilio'),
        ('certificado_estudios', 'Certificado de Estudios'),
        ('fotografia', 'Fotografía'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
    ]
    
    # Identificadores
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Relaciones
    pre_enrollment = models.ForeignKey(
        PreEnrollment,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Pre-inscripción'
    )
    
    # Información del documento
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        verbose_name='Tipo de Documento'
    )
    file_path = models.FileField(
        upload_to='pre_enrollment/documents/%Y/%m/',
        verbose_name='Archivo'
    )
    file_name = models.CharField(
        max_length=255,
        verbose_name='Nombre del Archivo'
    )
    file_size = models.IntegerField(
        blank=True,
        null=True,
        verbose_name='Tamaño',
        help_text='Tamaño en bytes'
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Tipo MIME'
    )
    
    # Estado
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Estado'
    )
    
    # Auditoría de revisión
    reviewer_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notas del Revisor'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='reviewed_documents',
        verbose_name='Revisado por'
    )
    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Revisión'
    )
    
    # Auditoría general
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Carga'
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
        db_table = 'documents'
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
        ordering = ['document_type']
        constraints = [
            models.UniqueConstraint(
                fields=['pre_enrollment', 'document_type'],
                name='unique_document_per_enrollment'
            )
        ]
        indexes = [
            models.Index(fields=['pre_enrollment']),
            models.Index(fields=['document_type']),
            models.Index(fields=['status']),
            models.Index(fields=['reviewed_by']),
        ]
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.pre_enrollment.student.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Guardar nombre del archivo si no está establecido
        if not self.file_name and self.file_path:
            self.file_name = self.file_path.name
        
        # Guardar tamaño del archivo
        if self.file_path and not self.file_size:
            self.file_size = self.file_path.size
        
        super().save(*args, **kwargs)


class Announcement(models.Model):
    """
    Convocatorias de admisión publicadas
    """
    
    id = models.AutoField(primary_key=True)
    
    # Relaciones
    period = models.ForeignKey(
        AcademicPeriod,
        on_delete=models.CASCADE,
        related_name='announcements',
        verbose_name='Periodo'
    )
    
    # Información
    title = models.CharField(
        max_length=255,
        verbose_name='Título'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción'
    )
    announcement_file = models.FileField(
        upload_to='announcements/',
        blank=True,
        null=True,
        verbose_name='Archivo de Convocatoria',
        help_text='PDF de la convocatoria'
    )
    
    # Fechas
    published_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Publicación'
    )
    deadline = models.DateField(
        verbose_name='Fecha Límite',
        help_text='Fecha límite de registro'
    )
    
    # Estado
    is_active = models.BooleanField(
        default=True,
        verbose_name='Activa'
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
        db_table = 'announcements'
        verbose_name = 'Convocatoria'
        verbose_name_plural = 'Convocatorias'
        ordering = ['-published_at']
        indexes = [
            models.Index(fields=['period']),
            models.Index(fields=['is_active']),
            models.Index(fields=['published_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.period.name}"
    
    @property
    def is_open(self):
        """Verifica si la convocatoria está abierta"""
        if not self.is_active or not self.published_at:
            return False
        today = timezone.now().date()
        return today <= self.deadline