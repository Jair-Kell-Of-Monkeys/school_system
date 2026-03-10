# apps/payments/serializers.py
from rest_framework import serializers
from django.conf import settings
from .models import Payment
from apps.pre_enrollment.models import PreEnrollment


class PaymentListSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_curp = serializers.SerializerMethodField()
    program_name = serializers.SerializerMethodField()
    program_code = serializers.SerializerMethodField()
    payment_type_display = serializers.CharField(
        source='get_payment_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    # Frontend expects 'receipt_number'; model field is 'reference_number'
    receipt_number = serializers.CharField(source='reference_number', read_only=True)
    validated_by = serializers.SerializerMethodField()
    validated_by_email = serializers.SerializerMethodField()
    receipt_file = serializers.SerializerMethodField()
    # Format DateTimeField as date string for the frontend
    payment_date = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'pre_enrollment',
            'student_name', 'student_curp', 'program_name', 'program_code',
            'payment_type', 'payment_type_display',
            'amount', 'receipt_number',
            'payment_date', 'receipt_file',
            'status', 'status_display',
            'validated_by', 'validated_by_email', 'validated_at',
            'validation_notes', 'created_at',
        ]

    def get_student_name(self, obj):
        if obj.pre_enrollment:
            return obj.pre_enrollment.student.get_full_name()
        return ''

    def get_student_curp(self, obj):
        if obj.pre_enrollment:
            return obj.pre_enrollment.student.curp
        return ''

    def get_program_name(self, obj):
        if obj.pre_enrollment:
            return obj.pre_enrollment.program.name
        return ''

    def get_program_code(self, obj):
        if obj.pre_enrollment:
            return obj.pre_enrollment.program.code
        return ''

    def get_validated_by(self, obj):
        if obj.validated_by:
            return str(obj.validated_by.id)
        return None

    def get_validated_by_email(self, obj):
        if obj.validated_by:
            return obj.validated_by.email
        return None

    def get_receipt_file(self, obj):
        if obj.receipt_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_file.url)
            return obj.receipt_file.url
        return None

    def get_payment_date(self, obj):
        if obj.payment_date:
            return obj.payment_date.strftime('%Y-%m-%d')
        return None


class PaymentDetailSerializer(PaymentListSerializer):
    pre_enrollment_detail = serializers.SerializerMethodField()

    class Meta(PaymentListSerializer.Meta):
        fields = PaymentListSerializer.Meta.fields + ['pre_enrollment_detail']

    def get_pre_enrollment_detail(self, obj):
        if not obj.pre_enrollment:
            return None
        pe = obj.pre_enrollment
        student = pe.student
        return {
            'id': str(pe.id),
            'student': {
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email or student.user.email,
                'phone': student.phone or '',
            },
            'program': {
                'code': pe.program.code,
                'name': pe.program.name,
            },
            'status': pe.status,
        }


class PaymentCreateSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(choices=Payment.PAYMENT_TYPE_CHOICES)
    pre_enrollment = serializers.PrimaryKeyRelatedField(
        queryset=PreEnrollment.objects.all()
    )

    def validate(self, data):
        pre_enrollment = data['pre_enrollment']
        request = self.context.get('request')

        if request and request.user.role == 'aspirante':
            if not hasattr(request.user, 'student_profile'):
                raise serializers.ValidationError('No tiene perfil de estudiante')
            if pre_enrollment.student != request.user.student_profile:
                raise serializers.ValidationError(
                    'No puede crear pagos para esta solicitud'
                )

        if pre_enrollment.status != 'payment_pending':
            raise serializers.ValidationError(
                'La solicitud debe estar en estado de pago pendiente'
            )

        return data

    def create(self, validated_data):
        payment_type = validated_data['payment_type']
        amount = settings.PAYMENT_AMOUNTS.get(payment_type, 0)
        return Payment.objects.create(
            pre_enrollment=validated_data['pre_enrollment'],
            payment_type=payment_type,
            amount=amount,
        )


class PaymentUploadReceiptSerializer(serializers.Serializer):
    receipt_file = serializers.FileField()
    payment_date = serializers.DateField()


class PaymentValidateSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class PaymentRejectSerializer(serializers.Serializer):
    notes = serializers.CharField()
