# apps/exams/serializers.py
from rest_framework import serializers
from django.utils import timezone

from .models import ExamSession, ExamVenue
from apps.academic.models import AcademicProgram, AcademicPeriod


class ExamVenueSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    location_display = serializers.ReadOnlyField()

    class Meta:
        model = ExamVenue
        fields = [
            'id', 'program', 'program_name', 'program_code',
            'building', 'room', 'capacity', 'location_display', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ExamVenueCreateSerializer(serializers.Serializer):
    program = serializers.PrimaryKeyRelatedField(
        queryset=AcademicProgram.objects.filter(is_active=True)
    )
    building = serializers.CharField(max_length=100)
    room = serializers.CharField(max_length=100)
    capacity = serializers.IntegerField(min_value=1)


class ExamSessionListSerializer(serializers.ModelSerializer):
    period_name = serializers.CharField(source='period.name', read_only=True)
    created_by_email = serializers.SerializerMethodField()
    venue_count = serializers.SerializerMethodField()
    total_capacity = serializers.ReadOnlyField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = ExamSession
        fields = [
            'id', 'name', 'period', 'period_name', 'exam_date', 'exam_time',
            'mode', 'passing_score', 'status', 'status_display',
            'created_by_email', 'venue_count', 'total_capacity', 'created_at',
        ]

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None

    def get_venue_count(self, obj):
        return obj.venues.count()

    def get_status_display(self, obj):
        return obj.get_status_display()


class ExamSessionDetailSerializer(serializers.ModelSerializer):
    period_name = serializers.CharField(source='period.name', read_only=True)
    created_by_email = serializers.SerializerMethodField()
    venues = ExamVenueSerializer(many=True, read_only=True)
    total_capacity = serializers.ReadOnlyField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = ExamSession
        fields = [
            'id', 'name', 'period', 'period_name', 'exam_date', 'exam_time',
            'mode', 'passing_score', 'status', 'status_display',
            'created_by_email', 'venues', 'total_capacity', 'created_at', 'updated_at',
        ]

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None

    def get_status_display(self, obj):
        return obj.get_status_display()


class ExamSessionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    period = serializers.PrimaryKeyRelatedField(queryset=AcademicPeriod.objects.all())
    exam_date = serializers.DateField()
    exam_time = serializers.TimeField()
    mode = serializers.ChoiceField(choices=['presencial', 'en_linea'])
    passing_score = serializers.IntegerField(min_value=0, max_value=100, default=70)
    venues = ExamVenueCreateSerializer(many=True)

    def validate_venues(self, value):
        if not value:
            raise serializers.ValidationError(
                'Se requiere al menos un salón de examen.'
            )
        return value

    def validate_exam_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError(
                'La fecha del examen debe ser en el futuro.'
            )
        return value


class GradeSerializer(serializers.Serializer):
    attended = serializers.BooleanField()
    exam_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
        required=False,
        allow_null=True,
    )

    def validate(self, data):
        if data.get('attended') and data.get('exam_score') is None:
            raise serializers.ValidationError(
                {'exam_score': 'La calificación es requerida cuando el aspirante asistió.'}
            )
        return data


class ExamAspirantSerializer(serializers.Serializer):
    """
    Serializer para mostrar aspirantes en el panel de calificación del encargado.
    Wraps a PreEnrollment queryset.
    """
    id = serializers.UUIDField()
    student_name = serializers.SerializerMethodField()
    student_curp = serializers.SerializerMethodField()
    program_name = serializers.SerializerMethodField()
    program_code = serializers.SerializerMethodField()
    exam_location = serializers.CharField(allow_null=True)
    exam_date = serializers.DateTimeField(allow_null=True)
    exam_score = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_student_curp(self, obj):
        return obj.student.curp

    def get_program_name(self, obj):
        return obj.program.name

    def get_program_code(self, obj):
        return obj.program.code

    def get_status_display(self, obj):
        return obj.get_status_display()
