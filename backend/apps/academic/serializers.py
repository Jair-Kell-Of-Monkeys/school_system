# apps/academic/serializers.py
from rest_framework import serializers
from .models import AcademicPeriod, AcademicProgram


class AcademicPeriodListSerializer(serializers.ModelSerializer):
    """Serializer para listar periodos (vista resumida)"""
    
    is_enrollment_open = serializers.BooleanField(read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AcademicPeriod
        fields = [
            'id',
            'name',
            'start_date',
            'end_date',
            'enrollment_start',
            'enrollment_end',
            'is_active',
            'is_enrollment_open',
            'is_current',
            'duration_days',
            'created_at',
        ]


class AcademicPeriodDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalles completos del periodo"""
    
    is_enrollment_open = serializers.BooleanField(read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AcademicPeriod
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class AcademicPeriodCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar periodos"""
    
    class Meta:
        model = AcademicPeriod
        fields = [
            'name',
            'start_date',
            'end_date',
            'enrollment_start',
            'enrollment_end',
            'is_active',
        ]
    
    def validate(self, data):
        """Validaciones personalizadas"""
        # Validar que end_date sea después de start_date
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError({
                    'end_date': 'La fecha de fin debe ser posterior a la fecha de inicio'
                })
        
        # Validar fechas de inscripción
        if data.get('enrollment_end') and data.get('enrollment_start'):
            if data['enrollment_end'] <= data['enrollment_start']:
                raise serializers.ValidationError({
                    'enrollment_end': 'La fecha de fin de inscripciones debe ser posterior al inicio'
                })
        
        return data


class AcademicProgramListSerializer(serializers.ModelSerializer):
    """Serializer para listar programas (vista resumida)"""
    
    class Meta:
        model = AcademicProgram
        fields = [
            'id',
            'name',
            'code',
            'duration',
            'max_capacity',
            'is_active',
            'created_at',
        ]


class AcademicProgramDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalles completos del programa"""
    
    class Meta:
        model = AcademicProgram
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class AcademicProgramCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar programas"""
    
    class Meta:
        model = AcademicProgram
        fields = [
            'name',
            'code',
            'description',
            'duration',
            'max_capacity',
            'is_active',
        ]
    
    def validate_code(self, value):
        """Convertir código a mayúsculas"""
        return value.upper()
    
    def validate_duration(self, value):
        """Validar duración"""
        if value <= 0:
            raise serializers.ValidationError(
                'La duración debe ser mayor a 0'
            )
        return value
    
    def validate_max_capacity(self, value):
        """Validar capacidad máxima"""
        if value <= 0:
            raise serializers.ValidationError(
                'La capacidad máxima debe ser mayor a 0'
            )
        return value


class ProgramCapacitySerializer(serializers.Serializer):
    """Serializer para capacidad de programa por periodo"""
    
    program_id = serializers.IntegerField()
    program_name = serializers.CharField()
    program_code = serializers.CharField()
    period_id = serializers.IntegerField()
    period_name = serializers.CharField()
    max_capacity = serializers.IntegerField()
    enrolled_count = serializers.IntegerField()
    available_capacity = serializers.IntegerField()
    has_capacity = serializers.BooleanField()