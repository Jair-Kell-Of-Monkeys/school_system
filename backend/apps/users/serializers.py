# apps/users/serializers.py
"""
Serializers para autenticación y gestión de usuarios.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, UserProgramPermission
from apps.academic.models import AcademicProgram


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer básico para Usuario.
    """
    role_display = serializers.CharField(source='get_role_display_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'role',
            'role_display',
            'is_active',
            'is_staff',
            'date_joined',
            'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer para registro de nuevos usuarios (aspirantes).
    Crea User + Student en una transacción atómica.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    # Datos personales del estudiante
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    second_last_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=''
    )
    curp = serializers.CharField(max_length=18)
    date_of_birth = serializers.DateField()
    gender = serializers.ChoiceField(choices=[
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
        ('otro', 'Otro'),
        ('prefiero_no_decir', 'Prefiero no decir'),
    ])
    phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True, default=''
    )
    city = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=''
    )
    state = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=''
    )

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'second_last_name',
            'curp', 'date_of_birth', 'gender',
            'phone', 'city', 'state',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('Este email ya está registrado.')
        return value.lower()

    def validate_curp(self, value):
        import re
        curp = value.upper()
        if not re.match(r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$', curp):
            raise serializers.ValidationError(
                'CURP inválido. Formato: 4 letras, 6 dígitos, H/M, 5 letras, 1 alfanumérico, 1 dígito.'
            )
        from apps.students.models import Student
        if Student.objects.filter(curp=curp).exists():
            raise serializers.ValidationError('Este CURP ya está registrado.')
        return curp

    def create(self, validated_data):
        from django.db import transaction
        from apps.students.models import Student

        validated_data.pop('password_confirm')
        is_active = validated_data.pop('is_active', True)

        student_fields = [
            'first_name', 'last_name', 'second_last_name',
            'curp', 'date_of_birth', 'gender',
            'phone', 'city', 'state',
        ]
        student_data = {
            field: validated_data.pop(field)
            for field in student_fields
            if field in validated_data
        }

        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                role='aspirante',
                is_active=is_active,
            )
            Student.objects.create(user=user, **student_data)

        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer para login.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """
        Validar credenciales y autenticar usuario.
        """
        email = attrs.get('email', '').lower()
        password = attrs.get('password')
        
        if not email or not password:
            raise serializers.ValidationError('Email y contraseña son requeridos.')
        
        # Autenticar usuario
        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )
        
        if not user:
            raise serializers.ValidationError('Credenciales inválidas.')

        if not user.is_active:
            # Verificar si la cuenta está pendiente de verificación de email
            has_pending_verification = (
                hasattr(user, 'email_verification') and
                not user.email_verification.is_used
            )
            if has_pending_verification:
                raise serializers.ValidationError(
                    'Tu cuenta no ha sido verificada. Revisa tu correo electrónico '
                    'y haz clic en el enlace de verificación.'
                )
            raise serializers.ValidationError('Esta cuenta está inactiva.')
        
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer para cambio de contraseña.
    """
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """
        Validar que las contraseñas nuevas coincidan.
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Las contraseñas no coinciden.'
            })
        return attrs
    
    def validate_old_password(self, value):
        """
        Validar que la contraseña actual sea correcta.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('La contraseña actual es incorrecta.')
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    """
    Serializer para solicitar restablecimiento de contraseña.
    Solo requiere el email del usuario.
    """
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    """
    Serializer para establecer la nueva contraseña usando el token recibido por correo.
    """
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        style={'input_type': 'password'},
    )
    confirm_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
    )

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Las contraseñas no coinciden.'
            })
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer completo para perfil de usuario.
    Incluye información del estudiante si existe.
    """
    role_display = serializers.CharField(source='get_role_display_name', read_only=True)
    has_student_profile = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'role',
            'role_display',
            'is_active',
            'date_joined',
            'last_login',
            'has_student_profile',
            'student_name',
        ]
        read_only_fields = ['id', 'role', 'date_joined', 'last_login']
    
    def get_has_student_profile(self, obj):
        """
        Verifica si el usuario tiene perfil de estudiante.
        """
        return hasattr(obj, 'student_profile')

    def get_student_name(self, obj):
        """
        Retorna el nombre completo del estudiante si existe.
        """
        if hasattr(obj, 'student_profile'):
            s = obj.student_profile
            return f"{s.first_name} {s.last_name}"
        return None


class UpdateUserRoleSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar el rol de un usuario.
    Solo para administradores.
    """
    
    class Meta:
        model = User
        fields = ['role']
    
    def validate_role(self, value):
        """
        Validar transición de roles.
        """
        user = self.instance
        current_role = user.role
        
        # Validar transiciones permitidas
        valid_transitions = {
            'aspirante': ['alumno'],  # Aspirante solo puede pasar a alumno
            'alumno': ['alumno'],     # Alumno se mantiene
            # Staff puede cambiar a cualquier rol staff
        }
        
        # Si es aspirante o alumno, validar transición
        if current_role in ['aspirante', 'alumno']:
            if value not in valid_transitions.get(current_role, []):
                raise serializers.ValidationError(
                    f'No se puede cambiar de {current_role} a {value}'
                )
        
        return value

class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar usuarios (vista simplificada).
    """
    role_display = serializers.CharField(source='get_role_display_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'role',
            'role_display',
            'is_active',
            'date_joined',
        ]

class UserProgramPermissionSerializer(serializers.ModelSerializer):
    """Serializer para permisos de programas"""
    
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    assigned_by_email = serializers.EmailField(
        source='assigned_by.email',
        read_only=True
    )
    
    class Meta:
        model = UserProgramPermission
        fields = [
            'id',
            'user',
            'program',
            'program_name',
            'program_code',
            'assigned_by',
            'assigned_by_email',
            'assigned_at',
        ]
        read_only_fields = ['assigned_by', 'assigned_at']


class AssignProgramsSerializer(serializers.Serializer):
    """Serializer para asignar múltiples programas"""
    
    user_id = serializers.UUIDField()
    program_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True
    )
    
    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
            if user.role != 'servicios_escolares':
                raise serializers.ValidationError(
                    'Solo se pueden asignar programas a usuarios de Servicios Escolares'
                )
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError('Usuario no encontrado')
    
    def validate_program_ids(self, value):
        existing = AcademicProgram.objects.filter(
            id__in=value,
            is_active=True
        ).count()
        if existing != len(value):
            raise serializers.ValidationError(
                'Uno o más programas no existen o están inactivos'
            )
        return value


class UserWithProgramsSerializer(serializers.ModelSerializer):
    """Serializer de usuario con programas asignados"""
    
    assigned_programs = serializers.SerializerMethodField()
    program_permissions = UserProgramPermissionSerializer(
        many=True,
        read_only=True
    )
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'role',
            'is_active',
            'assigned_programs',
            'program_permissions',
            'date_joined',
        ]
    
    def get_assigned_programs(self, obj):
        programs = obj.get_accessible_programs()
        return [
            {
                'id': p.id,
                'name': p.name,
                'code': p.code
            }
            for p in programs
        ]