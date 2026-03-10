# apps/payments/filters.py
import django_filters
from .models import Payment


class PaymentFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Payment.STATUS_CHOICES)
    payment_type = django_filters.ChoiceFilter(choices=Payment.PAYMENT_TYPE_CHOICES)
    pre_enrollment = django_filters.UUIDFilter(field_name='pre_enrollment__id')
    created_after = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='gte'
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at', lookup_expr='lte'
    )

    class Meta:
        model = Payment
        fields = ['status', 'payment_type', 'pre_enrollment', 'created_after', 'created_before']
