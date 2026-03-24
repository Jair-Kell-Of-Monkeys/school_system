# apps/credentials/serializers.py
from rest_framework import serializers
from .models import CredentialConvocatoria, CredentialRequest, Credential


# ─── Convocatoria ────────────────────────────────────────────────────────────

class CredentialConvocatoriaListSerializer(serializers.ModelSerializer):
    period_name = serializers.CharField(source='period.name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CredentialConvocatoria
        fields = [
            'id', 'title', 'description', 'requirements',
            'period', 'period_name',
            'fecha_inicio', 'fecha_fin',
            'status', 'status_display',
            'created_by', 'created_by_email',
            'created_at', 'updated_at',
        ]


class CredentialConvocatoriaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CredentialConvocatoria
        fields = ['title', 'description', 'requirements', 'period', 'fecha_inicio', 'fecha_fin']

    def validate(self, attrs):
        if attrs['fecha_fin'] <= attrs['fecha_inicio']:
            raise serializers.ValidationError(
                {'fecha_fin': 'La fecha de cierre debe ser posterior a la fecha de inicio.'}
            )
        return attrs


# ─── CredentialRequest ───────────────────────────────────────────────────────

class CredentialRequestListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    student_name = serializers.SerializerMethodField()
    student_curp = serializers.SerializerMethodField()
    matricula = serializers.SerializerMethodField()
    program_name = serializers.SerializerMethodField()
    program_code = serializers.SerializerMethodField()
    period_name = serializers.SerializerMethodField()
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)
    convocatoria_title = serializers.CharField(source='convocatoria.title', read_only=True)
    photo_url = serializers.SerializerMethodField()
    credential_id = serializers.SerializerMethodField()

    class Meta:
        model = CredentialRequest
        fields = [
            'id', 'convocatoria', 'convocatoria_title', 'enrollment',
            'status', 'status_display',
            'student_name', 'student_curp', 'matricula',
            'program_name', 'program_code', 'period_name',
            'photo_url',
            'rejection_reason',
            'credential_id',
            'reviewed_by', 'reviewed_by_email',
            'requested_at', 'reviewed_at', 'updated_at',
        ]

    def _get_enrollment_obj(self, obj):
        if not hasattr(obj, '_cached_enrollment_obj'):
            from apps.enrollments.models import Enrollment
            try:
                obj._cached_enrollment_obj = Enrollment.objects.select_related(
                    'student__user', 'program', 'period'
                ).get(pk=obj.enrollment_id)
            except Enrollment.DoesNotExist:
                obj._cached_enrollment_obj = None
        return obj._cached_enrollment_obj

    def get_student_name(self, obj):
        e = self._get_enrollment_obj(obj)
        return e.student.get_full_name() if e else ''

    def get_student_curp(self, obj):
        e = self._get_enrollment_obj(obj)
        return e.student.curp if e else ''

    def get_matricula(self, obj):
        e = self._get_enrollment_obj(obj)
        return e.matricula if e else ''

    def get_program_name(self, obj):
        e = self._get_enrollment_obj(obj)
        return e.program.name if e else ''

    def get_program_code(self, obj):
        e = self._get_enrollment_obj(obj)
        return e.program.code if e else ''

    def get_period_name(self, obj):
        e = self._get_enrollment_obj(obj)
        return e.period.name if e else ''

    def get_credential_id(self, obj):
        if obj.status == 'generada':
            try:
                from .models import Credential
                cred = Credential.objects.filter(enrollment_id=obj.enrollment_id).first()
                return str(cred.id) if cred else None
            except Exception:
                return None
        return None

    def get_photo_url(self, obj):
        e = self._get_enrollment_obj(obj)
        if not e:
            return None
        student = e.student
        if student.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(student.photo.url)
            return student.photo.url
        return None


class CredentialRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CredentialRequest
        fields = ['convocatoria']


class CredentialRequestRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=1000,
    )


# ─── Credential ──────────────────────────────────────────────────────────────

class CredentialSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()
    qr_url = serializers.SerializerMethodField()

    class Meta:
        model = Credential
        fields = [
            'id', 'enrollment', 'pdf_url', 'qr_url',
            'issued_at', 'valid_until', 'is_active',
            'delivery_method', 'created_at',
        ]

    def get_pdf_url(self, obj):
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None

    def get_qr_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None
