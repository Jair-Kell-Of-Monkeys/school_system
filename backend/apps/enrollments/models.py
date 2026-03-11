# apps/enrollments/models.py
import uuid
from django.db import models
from apps.students.models import Student
from apps.academic.models import AcademicPeriod, AcademicProgram
from apps.pre_enrollment.models import PreEnrollment
from apps.users.models import User


class Enrollment(models.Model):
    """
    Inscripción formal de un estudiante aceptado.
    managed=False porque la tabla 'enrollments' ya existe en la BD (propiedad de postgres).
    """

    STATUS_CHOICES = [
        ('pending_docs', 'Documentos Pendientes'),
        ('docs_submitted', 'Documentos Enviados'),
        ('docs_approved', 'Documentos Aprobados'),
        ('pending_payment', 'Pago Pendiente'),
        ('payment_submitted', 'Pago Enviado'),
        ('payment_validated', 'Pago Validado'),
        ('enrolled', 'Inscrito'),
        ('active', 'Activo'),
        ('inactive', 'Inactivo'),
        ('withdrawn', 'Baja'),
        ('graduated', 'Graduado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        Student,
        on_delete=models.PROTECT,
        related_name='enrollments',
        verbose_name='Estudiante',
    )
    program = models.ForeignKey(
        AcademicProgram,
        on_delete=models.PROTECT,
        related_name='enrollments',
        verbose_name='Programa',
    )
    period = models.ForeignKey(
        AcademicPeriod,
        on_delete=models.PROTECT,
        related_name='enrollments',
        verbose_name='Periodo',
    )
    pre_enrollment = models.OneToOneField(
        PreEnrollment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollment',
        verbose_name='Pre-inscripción',
    )

    matricula = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Matrícula',
    )
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='Estado',
    )

    # Los campos group y schedule son de tipo texto en la BD
    group = models.TextField(
        blank=True,
        null=True,
        db_column='group',
        verbose_name='Grupo',
    )
    schedule = models.TextField(
        blank=True,
        null=True,
        db_column='schedule',
        verbose_name='Horario',
    )

    enrolled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Inscripción',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        managed = False  # La tabla ya existe en la BD (propiedad de postgres)
        db_table = 'enrollments'
        verbose_name = 'Inscripción'
        verbose_name_plural = 'Inscripciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['program']),
            models.Index(fields=['period']),
            models.Index(fields=['status']),
            models.Index(fields=['matricula']),
        ]

    def __str__(self):
        return f"{self.matricula} - {self.student.get_full_name()}"


class EnrollmentDocument(models.Model):
    """
    Documentos entregados durante la inscripción formal.
    Sigue el mismo patrón que pre_enrollment.Document.
    La tabla 'enrollment_documents' es nueva y se crea con la migración.
    """

    DOCUMENT_TYPE_CHOICES = [
        ('numero_seguridad_social', 'Número de Seguridad Social'),
        ('certificado_bachillerato', 'Certificado de Bachillerato'),
        ('acta_nacimiento', 'Acta de Nacimiento'),
        ('curp', 'CURP'),
        ('comprobante_domicilio', 'Comprobante de Domicilio'),
        ('certificado_estudios', 'Certificado de Estudios'),
        ('fotografia', 'Fotografía'),
        ('comprobante_pago', 'Comprobante de Pago'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Inscripción',
        db_constraint=False,  # No FK constraint en DB: enrollments es propiedad de postgres
    )

    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        verbose_name='Tipo de Documento',
    )
    file_path = models.FileField(
        upload_to='enrollment/documents/%Y/%m/',
        verbose_name='Archivo',
    )
    file_name = models.CharField(
        max_length=255,
        verbose_name='Nombre del Archivo',
    )
    file_size = models.IntegerField(
        blank=True,
        null=True,
        verbose_name='Tamaño',
        help_text='Tamaño en bytes',
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Tipo MIME',
    )

    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Estado',
    )

    reviewer_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Notas del Revisor',
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='reviewed_enrollment_documents',
        verbose_name='Revisado por',
    )
    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Revisión',
    )

    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Carga')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        db_table = 'enrollment_documents'
        verbose_name = 'Documento de Inscripción'
        verbose_name_plural = 'Documentos de Inscripción'
        ordering = ['document_type']
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'document_type'],
                name='unique_document_per_enrollment_formal',
            )
        ]
        indexes = [
            models.Index(fields=['enrollment']),
            models.Index(fields=['document_type']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.enrollment.student.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.file_name and self.file_path:
            self.file_name = self.file_path.name
        if self.file_path and not self.file_size:
            self.file_size = self.file_path.size
        super().save(*args, **kwargs)
