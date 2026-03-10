# apps/pre_enrollment/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import PreEnrollment, Document, Announcement
from apps.students.serializers import StudentDetailSerializer
from apps.academic.serializers import (
    AcademicProgramDetailSerializer,
    AcademicPeriodDetailSerializer
)


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer para documentos"""
    
    document_type_display = serializers.CharField(
        source='get_document_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    reviewed_by_email = serializers.EmailField(
        source='reviewed_by.email',
        read_only=True
    )
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id',
            'document_type',
            'document_type_display',
            'file_path',
            'file_url',
            'file_name',
            'file_size',
            'mime_type',
            'status',
            'status_display',
            'reviewer_notes',
            'reviewed_by',
            'reviewed_by_email',
            'reviewed_at',
            'uploaded_at',
        ]
        read_only_fields = [
            'id',
            'file_name',
            'file_size',
            'mime_type',
            'reviewed_by',
            'reviewed_at',
            'uploaded_at',
        ]
    
    def get_file_url(self, obj):
        if obj.file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file_path.url)
        return None


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer para subir documentos"""

    # El frontend envía el archivo con el nombre 'file'; lo mapeamos a file_path en el modelo
    file = serializers.FileField(source='file_path')

    class Meta:
        model = Document
        fields = ['document_type', 'file']

    def validate_file(self, value):
        """Validar tamaño y tipo de archivo"""
        # Máximo 10MB
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                'El archivo no puede exceder los 10MB'
            )

        # Validar extensión
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
        ext = value.name.lower().split('.')[-1]
        if f'.{ext}' not in allowed_extensions:
            raise serializers.ValidationError(
                f'Extensión no permitida. Use: {", ".join(allowed_extensions)}'
            )

        return value


class DocumentReviewSerializer(serializers.Serializer):
    """Serializer para revisar documentos"""
    
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    reviewer_notes = serializers.CharField(
        required=False,
        allow_blank=True
    )
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('reviewer_notes'):
            raise serializers.ValidationError({
                'reviewer_notes': 'Debe proporcionar notas al rechazar un documento'
            })
        return data


class PreEnrollmentListSerializer(serializers.ModelSerializer):
    """Serializer para listar pre-inscripciones"""
    
    student_name = serializers.CharField(
        source='student.get_full_name',
        read_only=True
    )
    student_curp = serializers.CharField(
        source='student.curp',
        read_only=True
    )
    program_name = serializers.CharField(
        source='program.name',
        read_only=True
    )
    program_code = serializers.CharField(
        source='program.code',
        read_only=True
    )
    period_name = serializers.CharField(
        source='period.name',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = PreEnrollment
        fields = [
            'id',
            'student_name',
            'student_curp',
            'program_name',
            'program_code',
            'period_name',
            'status',
            'status_display',
            'exam_date',
            'exam_score',
            'submitted_at',
            'created_at',
        ]


class PreEnrollmentDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalles de pre-inscripción"""
    
    student = StudentDetailSerializer(read_only=True)
    program = AcademicProgramDetailSerializer(read_only=True)
    period = AcademicPeriodDetailSerializer(read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    exam_mode_display = serializers.CharField(
        source='get_exam_mode_display',
        read_only=True
    )
    reviewed_by_email = serializers.EmailField(
        source='reviewed_by.email',
        read_only=True
    )
    approved_by_email = serializers.EmailField(
        source='approved_by.email',
        read_only=True
    )
    
    has_all_documents = serializers.BooleanField(read_only=True)
    has_payment = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PreEnrollment
        fields = '__all__'


class PreEnrollmentCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear pre-inscripción"""

    class Meta:
        model = PreEnrollment
        fields = ['program', 'period', 'notes']

    def validate(self, data):
        request = self.context.get('request')
        try:
            student = request.user.student_profile
        except AttributeError:
            raise serializers.ValidationError(
                'No tiene perfil de estudiante registrado'
            )

        if not data['period'].is_active:
            raise serializers.ValidationError({
                'period': 'El periodo seleccionado no está activo'
            })

        if not data['program'].is_active:
            raise serializers.ValidationError({
                'program': 'El programa seleccionado no está activo'
            })

        existing = PreEnrollment.objects.filter(
            student=student,
            period=data['period']
        ).exists()

        if existing:
            raise serializers.ValidationError(
                'Ya existe una pre-inscripción para este periodo'
            )

        data['student'] = student
        return data


class PreEnrollmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar pre-inscripción"""
    
    class Meta:
        model = PreEnrollment
        fields = ['notes']


class ScheduleExamSerializer(serializers.Serializer):
    """Serializer para programar examen"""
    
    exam_date = serializers.DateTimeField()
    exam_mode = serializers.ChoiceField(
        choices=PreEnrollment.EXAM_MODE_CHOICES
    )
    exam_location = serializers.CharField(max_length=255)
    
    def validate_exam_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                'La fecha del examen debe ser futura'
            )
        return value


class EnterScoreSerializer(serializers.Serializer):
    """Serializer para ingresar calificación"""
    
    exam_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True
    )


class ChangeStatusSerializer(serializers.Serializer):
    """Serializer para cambiar estado"""
    
    new_status = serializers.ChoiceField(
        choices=PreEnrollment.STATUS_CHOICES
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True
    )


class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer para convocatorias"""
    
    period_name = serializers.CharField(
        source='period.name',
        read_only=True
    )
    is_open = serializers.BooleanField(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = [
            'id',
            'period',
            'period_name',
            'title',
            'description',
            'announcement_file',
            'file_url',
            'published_at',
            'deadline',
            'is_active',
            'is_open',
            'created_at',
        ]
        read_only_fields = ['created_at']
    
    def get_file_url(self, obj):
        if obj.announcement_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.announcement_file.url)
        return None


class PreEnrollmentStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas"""
    
    total = serializers.IntegerField()
    by_status = serializers.DictField()
    by_program = serializers.DictField()
    by_period = serializers.DictField()
    average_exam_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        allow_null=True
    )
    acceptance_rate = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        allow_null=True
    )