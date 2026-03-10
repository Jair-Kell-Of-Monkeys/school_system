# apps/students/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Student

User = get_user_model()


class StudentListSerializer(serializers.ModelSerializer):
    """Serializer para listar estudiantes (vista resumida)"""
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    photo_status_display = serializers.CharField(
        source='get_photo_status_display',
        read_only=True
    )
    
    class Meta:
        model = Student
        fields = [
            'id',
            'full_name',
            'first_name',
            'last_name',
            'curp',
            'date_of_birth',
            'gender',
            'email',
            'user_email',
            'user_role',
            'institutional_email',
            'phone',
            'city',
            'state',
            'photo_status',
            'photo_status_display',
            'created_at',
        ]


class StudentDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalles completos del estudiante"""
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    complete_address = serializers.CharField(
        source='get_complete_address',
        read_only=True
    )
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    user_is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    
    photo_reviewed_by_name = serializers.SerializerMethodField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    education_level_display = serializers.CharField(
        source='get_education_level_display',
        read_only=True
    )
    photo_status_display = serializers.CharField(
        source='get_photo_status_display',
        read_only=True
    )
    
    class Meta:
        model = Student
        fields = '__all__'
    
    def get_photo_reviewed_by_name(self, obj):
        if obj.photo_reviewed_by:
            return obj.photo_reviewed_by.email
        return None


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear estudiantes"""
    
    user_email = serializers.EmailField(write_only=True)
    user_password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = Student
        fields = [
            'user_email',
            'user_password',
            'first_name',
            'last_name',
            'second_last_name',
            'curp',
            'date_of_birth',
            'gender',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'previous_school_name',
            'previous_school_city',
            'previous_school_state',
            'education_level',
            'graduation_year',
            'photo',
        ]
    
    def validate_curp(self, value):
        """Validar que el CURP esté en mayúsculas"""
        return value.upper()
    
    def create(self, validated_data):
        # Extraer datos del usuario
        user_email = validated_data.pop('user_email')
        user_password = validated_data.pop('user_password')
        
        # Crear usuario
        user = User.objects.create_user(
            email=user_email,
            password=user_password,
            role='aspirante'  # Por defecto es aspirante
        )
        
        # Crear estudiante
        student = Student.objects.create(
            user=user,
            **validated_data
        )
        
        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar estudiantes"""
    
    class Meta:
        model = Student
        fields = [
            'first_name',
            'last_name',
            'date_of_birth',
            'gender',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'zip_code',
            'previous_school_name',
            'previous_school_city',
            'previous_school_state',
            'education_level',
            'graduation_year',
            'photo',
        ]
    
    def validate_curp(self, value):
        """El CURP no debe ser modificable después de la creación"""
        if self.instance and self.instance.curp != value:
            raise serializers.ValidationError(
                "El CURP no puede ser modificado"
            )
        return value


class PhotoReviewSerializer(serializers.Serializer):
    """Serializer para aprobar/rechazar fotografías"""
    
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True
    )
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Debe proporcionar un motivo de rechazo'
            })
        return data


class StudentStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de estudiantes"""
    
    total_students = serializers.IntegerField()
    by_gender = serializers.DictField()
    by_state = serializers.DictField()
    by_education_level = serializers.DictField()
    by_photo_status = serializers.DictField()
    recent_registrations = serializers.IntegerField()