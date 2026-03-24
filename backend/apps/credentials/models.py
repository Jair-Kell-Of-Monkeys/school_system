# apps/credentials/models.py
import uuid
from django.db import models
from apps.academic.models import AcademicPeriod
from apps.enrollments.models import Enrollment
from apps.users.models import User


class CredentialConvocatoria(models.Model):
    """
    Convocatoria de credencialización publicada por el Jefe de Servicios Escolares.
    """

    STATUS_CHOICES = [
        ('borrador', 'Borrador'),
        ('activa', 'Activa'),
        ('cerrada', 'Cerrada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    period = models.ForeignKey(
        AcademicPeriod,
        on_delete=models.PROTECT,
        related_name='credential_convocatorias',
        verbose_name='Periodo Académico',
        db_constraint=False,
    )
    title = models.CharField(max_length=255, verbose_name='Título')
    description = models.TextField(blank=True, null=True, verbose_name='Descripción')
    requirements = models.TextField(
        blank=True, null=True, verbose_name='Requisitos de fotografía'
    )

    fecha_inicio = models.DateField(verbose_name='Inicio de solicitudes')
    fecha_fin = models.DateField(verbose_name='Cierre de solicitudes')

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='borrador',
        verbose_name='Estado',
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_convocatorias',
        verbose_name='Creado por',
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        db_table = 'credential_convocatorias'
        verbose_name = 'Convocatoria de Credencial'
        verbose_name_plural = 'Convocatorias de Credencial'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['period']),
        ]

    def __str__(self):
        return f"{self.title} ({self.period.name})"


class CredentialRequest(models.Model):
    """
    Solicitud de credencial enviada por un alumno inscrito.
    """

    STATUS_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('generada', 'Generada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    convocatoria = models.ForeignKey(
        CredentialConvocatoria,
        on_delete=models.PROTECT,
        related_name='requests',
        verbose_name='Convocatoria',
        db_constraint=False,
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='credential_requests',
        verbose_name='Inscripción',
        db_constraint=False,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendiente',
        verbose_name='Estado',
    )
    rejection_reason = models.TextField(
        blank=True, null=True, verbose_name='Motivo de rechazo'
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_credential_requests',
        verbose_name='Revisado por',
        db_constraint=False,
    )

    requested_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de solicitud')
    reviewed_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Fecha de revisión'
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        db_table = 'credential_requests'
        verbose_name = 'Solicitud de Credencial'
        verbose_name_plural = 'Solicitudes de Credencial'
        ordering = ['-requested_at']
        constraints = [
            models.UniqueConstraint(
                fields=['convocatoria', 'enrollment'],
                name='unique_request_per_convocatoria_enrollment',
            )
        ]
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['convocatoria']),
            models.Index(fields=['enrollment']),
        ]

    def __str__(self):
        return f"Solicitud {self.enrollment_id} — {self.get_status_display()}"


class Credential(models.Model):
    """
    Credencial generada. La tabla 'credentials' ya existe en la BD.
    managed=False — Django solo la registra en el estado de migraciones.
    """

    DELIVERY_CHOICES = [
        ('digital', 'Digital'),
        ('physical', 'Físico'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='credential',
        verbose_name='Inscripción',
        db_constraint=False,
    )
    pdf_file = models.FileField(
        upload_to='credentials/pdf/%Y/%m/',
        blank=True,
        null=True,
        verbose_name='Archivo PDF',
    )
    qr_code = models.ImageField(
        upload_to='credentials/qr/%Y/%m/',
        blank=True,
        null=True,
        verbose_name='Código QR',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='Emitida')
    valid_until = models.DateField(null=True, blank=True, verbose_name='Válida hasta')
    is_active = models.BooleanField(default=True, verbose_name='Activa')
    delivery_method = models.CharField(
        max_length=20,
        choices=DELIVERY_CHOICES,
        default='digital',
        verbose_name='Método de entrega',
    )
    physical_delivered_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Entregada físicamente'
    )
    physical_delivered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='delivered_credentials',
        verbose_name='Entregada por',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        managed = False
        db_table = 'credentials'
        verbose_name = 'Credencial'
        verbose_name_plural = 'Credenciales'

    def __str__(self):
        return f"Credencial {self.enrollment_id}"
