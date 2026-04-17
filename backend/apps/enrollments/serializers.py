# apps/enrollments/serializers.py
from rest_framework import serializers
from .models import Enrollment, EnrollmentDocument
from apps.students.serializers import StudentDetailSerializer
from apps.academic.serializers import (
    AcademicProgramDetailSerializer,
    AcademicPeriodDetailSerializer,
)


class EnrollmentDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(
        source='get_document_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_email = serializers.EmailField(
        source='reviewed_by.email', read_only=True
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentDocument
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


class EnrollmentDocumentUploadSerializer(serializers.ModelSerializer):
    # El frontend envía el archivo con el nombre 'file'; se mapea a file_path
    file = serializers.FileField(source='file_path')

    class Meta:
        model = EnrollmentDocument
        fields = ['document_type', 'file']

    def validate_file(self, value):
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("El archivo no puede exceder 10MB")
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Solo se permiten archivos PDF, JPG o PNG")
        return value


class EnrollmentDocumentReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    reviewer_notes = serializers.CharField(required=False, allow_blank=True)


class EnrollmentListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_curp = serializers.CharField(source='student.curp', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    institutional_email = serializers.EmailField(
        source='student.institutional_email', read_only=True
    )

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'matricula',
            'status',
            'status_display',
            'student_name',
            'student_curp',
            'institutional_email',
            'program_name',
            'program_code',
            'period_name',
            'group',
            'schedule',
            'enrolled_at',
            'created_at',
        ]


class EnrollmentDetailSerializer(serializers.ModelSerializer):
    student = StudentDetailSerializer(read_only=True)
    program = AcademicProgramDetailSerializer(read_only=True)
    period = AcademicPeriodDetailSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    documents = EnrollmentDocumentSerializer(many=True, read_only=True)
    institutional_email = serializers.EmailField(
        source='student.institutional_email', read_only=True
    )
    # Flat fields for frontend convenience (mirrors EnrollmentListSerializer)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_curp = serializers.CharField(source='student.curp', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    credential_status = serializers.SerializerMethodField()

    def get_credential_status(self, obj):
        from apps.credentials.models import CredentialRequest
        return CredentialRequest.objects.filter(
            enrollment=obj
        ).values_list('status', flat=True).first()

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'matricula',
            'status',
            'status_display',
            'student_name',
            'student_curp',
            'program_name',
            'program_code',
            'period_name',
            'student',
            'program',
            'period',
            'pre_enrollment',
            'group',
            'schedule',
            'institutional_email',
            'enrolled_at',
            'documents',
            'credential_status',
            'created_at',
            'updated_at',
        ]


class EnrollmentCreateSerializer(serializers.Serializer):
    """
    Crea una inscripción a partir de una pre-inscripción en estado 'accepted'.
    """
    pre_enrollment_id = serializers.UUIDField()
    group = serializers.CharField(required=False, allow_blank=True, default='')
    schedule = serializers.CharField(required=False, allow_blank=True, default='')


class EnrollmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ['status', 'group', 'schedule']
