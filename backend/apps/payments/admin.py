from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'reference_number', 'pre_enrollment', 'payment_type',
        'amount', 'status', 'created_at',
    ]
    list_filter = ['status', 'payment_type']
    search_fields = ['reference_number', 'pre_enrollment__student__first_name']
    readonly_fields = ['id', 'reference_number', 'created_at', 'updated_at']
