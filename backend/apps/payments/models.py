# apps/payments/models.py
import uuid
from django.db import models
from apps.pre_enrollment.models import PreEnrollment
from apps.users.models import User


class Payment(models.Model):
    """
    Modelo de pagos que mapea a la tabla existente 'payments'.
    Se usa managed=False porque la tabla fue creada por el script inicial de BD.
    """
    PAYMENT_TYPE_CHOICES = [
        ('examen_admision', 'Examen de Admisión'),
        ('inscripcion', 'Inscripción'),
        ('colegiatura', 'Colegiatura'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('validated', 'Validado'),
        ('rejected', 'Rechazado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relación con pre-inscripción (nullable en la BD por el constraint chk_payment_relation)
    pre_enrollment = models.ForeignKey(
        PreEnrollment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Pre-inscripción'
    )

    # Almacenado en la columna 'concept' — mismo valor que el tipo de pago
    payment_type = models.CharField(
        max_length=100,
        choices=PAYMENT_TYPE_CHOICES,
        db_column='concept',
        verbose_name='Tipo de Pago'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Monto'
    )

    # Columna reference_number en la BD es nullable; se auto-genera en save()
    reference_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='Número de Referencia'
    )

    # Comprobante de pago almacenado en la columna 'payment_proof'
    receipt_file = models.FileField(
        upload_to='payment_proofs/%Y/%m/',
        null=True,
        blank=True,
        db_column='payment_proof',
        verbose_name='Comprobante'
    )

    # Fecha de pago almacenada en la columna 'paid_at' (TIMESTAMP en BD)
    payment_date = models.DateTimeField(
        null=True,
        blank=True,
        db_column='paid_at',
        verbose_name='Fecha de Pago'
    )

    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Estado'
    )

    validated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='validated_payments',
        verbose_name='Validado por'
    )
    validated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Validación'
    )

    # Notas de validación almacenadas en la columna 'rejection_reason'
    validation_notes = models.TextField(
        blank=True,
        db_column='rejection_reason',
        verbose_name='Notas de Validación'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        managed = False  # La tabla ya existe en la BD (creada por el script inicial)
        db_table = 'payments'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-created_at']

    def __str__(self):
        ref = self.reference_number or str(self.id)
        return f"{ref} - {self.get_payment_type_display()}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            from .generators import generate_reference_number
            self.reference_number = generate_reference_number()
        super().save(*args, **kwargs)
