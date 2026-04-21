# apps/users/models.py
"""
Modelo de Usuario personalizado para el sistema universitario.
Se conecta a la tabla 'users' existente en PostgreSQL.
"""

import uuid
import logging
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.utils import timezone
import secrets

logger = logging.getLogger(__name__)


class UserManager(BaseUserManager):
    """
    Manager personalizado para el modelo User.
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Crea y guarda un usuario regular.
        """
        if not email:
            raise ValueError('El email es obligatorio')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Crea y guarda un superusuario.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de Usuario personalizado.
    Se conecta a la tabla 'users' existente en PostgreSQL.
    """
    
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('servicios_escolares_jefe', 'Jefe de Servicios Escolares'),  # NUEVO
        ('servicios_escolares', 'Encargado de Servicios Escolares'),   # MODIFICAD
        ('finanzas', 'Finanzas'),
        ('vinculacion', 'Vinculación'),
        ('aspirante', 'Aspirante'),
        ('alumno', 'Alumno'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('Email', max_length=255, unique=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, verbose_name='Rol')
    
    # Relación con programas asignados
    assigned_programs = models.ManyToManyField(
        'academic.AcademicProgram',
        through='UserProgramPermission',
        through_fields=('user', 'program'),
        related_name='authorized_users',
        blank=True,
        verbose_name='Programas Asignados'
    )

    def has_program_access(self, program):
        """Verifica si el usuario tiene acceso a un programa"""
        # Admin y jefe tienen acceso a todo
        if self.role in ['admin', 'servicios_escolares_jefe']:
            return True
        
        # Servicios escolares solo a sus programas asignados
        if self.role == 'servicios_escolares':
            return self.assigned_programs.filter(id=program.id).exists()
        
        return False
    
    def get_accessible_programs(self):
        """Retorna los programas a los que tiene acceso"""
        from apps.academic.models import AcademicProgram

        if self.role in ['admin', 'servicios_escolares_jefe']:
            return AcademicProgram.objects.all()

        if self.role == 'servicios_escolares':
            programs = self.assigned_programs.all()
            program_ids = list(programs.values_list('id', flat=True))
            logger.debug(
                '[get_accessible_programs] user=%s role=%s → %d programas: %s',
                self.email, self.role, len(program_ids), program_ids
            )
            return programs

        logger.debug(
            '[get_accessible_programs] user=%s role=%s → sin acceso',
            self.email, self.role
        )
        return AcademicProgram.objects.none()

    # Campos de Django para autenticación
    is_active = models.BooleanField('Activo', default=True)
    is_staff = models.BooleanField('Staff', default=False)
    is_superuser = models.BooleanField('Superusuario', default=False)
    
    # Timestamps
    last_login = models.DateTimeField('Último login', null=True, blank=True)
    date_joined = models.DateTimeField('Fecha de registro', default=timezone.now)
    created_at = models.DateTimeField('Creado', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado', auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        managed = False  # No crear tabla, usar la existente
        db_table = 'users'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Retorna el email como nombre completo."""
        return self.email
    
    def get_short_name(self):
        """Retorna el email como nombre corto."""
        return self.email
    
    # Métodos de conveniencia para verificar roles
    @property
    def is_admin(self):
        """Verifica si el usuario es administrador."""
        return self.role == 'admin'
    
    @property
    def is_servicios_escolares(self):
        """Verifica si el usuario es de servicios escolares."""
        return self.role in ['admin', 'servicios_escolares']
    
    @property
    def is_finanzas(self):
        """Verifica si el usuario es de finanzas."""
        return self.role in ['admin', 'finanzas']
    
    @property
    def is_vinculacion(self):
        """Verifica si el usuario es de vinculación."""
        return self.role in ['admin', 'vinculacion']
    
    @property
    def is_aspirante(self):
        """Verifica si el usuario es aspirante."""
        return self.role == 'aspirante'
    
    @property
    def is_alumno(self):
        """Verifica si el usuario es alumno."""
        return self.role == 'alumno'
    
    @property
    def is_estudiante(self):
        """Verifica si el usuario es estudiante (aspirante o alumno)."""
        return self.role in ['aspirante', 'alumno']
    
    def get_role_display_name(self):
        """Retorna el nombre legible del rol."""
        return dict(self.ROLE_CHOICES).get(self.role, self.role)
class UserProgramPermission(models.Model):
    """
    Tabla intermedia para asignar programas a usuarios de Servicios Escolares
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='program_permissions',
        verbose_name='Usuario'
    )
    program = models.ForeignKey(
        'academic.AcademicProgram',
        on_delete=models.CASCADE,
        related_name='user_permissions',
        verbose_name='Programa'
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_permissions',
        verbose_name='Asignado por'
    )
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Asignación'
    )
    
    class Meta:
        db_table = 'user_program_permissions'
        verbose_name = 'Permiso de Programa'
        verbose_name_plural = 'Permisos de Programas'
        unique_together = [['user', 'program']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['program']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.program.code}"
    
    def clean(self):
        """Validar que solo servicios_escolares tenga asignaciones"""
        if self.user.role not in ['servicios_escolares']:
            raise ValidationError(
                'Solo se pueden asignar programas a usuarios de Servicios Escolares'
            )

# Agregar al final del archivo, después de UserProgramPermission

class EmailVerificationToken(models.Model):
    """
    Token para verificación de email de nuevos usuarios.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='email_verification',
        verbose_name='Usuario'
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        verbose_name='Token'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    expires_at = models.DateTimeField(
        verbose_name='Expira'
    )
    is_used = models.BooleanField(
        default=False,
        verbose_name='Usado'
    )
    
    class Meta:
        db_table = 'email_verification_tokens'
        verbose_name = 'Token de Verificación'
        verbose_name_plural = 'Tokens de Verificación'
    
    def __str__(self):
        return f"Token de {self.user.email}"
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            from django.conf import settings
            hours = getattr(settings, 'EMAIL_VERIFICATION_EXPIRY_HOURS', 24)
            self.expires_at = timezone.now() + timezone.timedelta(hours=hours)
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired


class PasswordResetToken(models.Model):
    """
    Token de un solo uso para restablecer contraseña olvidada.
    Expira en 1 hora.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Usuario'
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        verbose_name='Token'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    is_used = models.BooleanField(
        default=False,
        verbose_name='Usado'
    )

    class Meta:
        db_table = 'password_reset_tokens'
        verbose_name = 'Token de Restablecimiento'
        verbose_name_plural = 'Tokens de Restablecimiento'

    def __str__(self):
        return f"Reset token de {self.user.email}"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def is_valid(self):
        if self.is_used:
            return False
        expiry = self.created_at + timezone.timedelta(hours=1)
        return timezone.now() < expiry