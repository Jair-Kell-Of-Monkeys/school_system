# apps/pre_enrollment/filters.py
import django_filters
from .models import PreEnrollment, Document


class PreEnrollmentFilter(django_filters.FilterSet):
    """Filtros para pre-inscripciones"""
    
    status = django_filters.ChoiceFilter(choices=PreEnrollment.STATUS_CHOICES)
    program = django_filters.NumberFilter(field_name='program__id')
    period = django_filters.NumberFilter(field_name='period__id')
    student = django_filters.UUIDFilter(field_name='student__id')
    
    # Filtros de fecha
    submitted_after = django_filters.DateTimeFilter(
        field_name='submitted_at',
        lookup_expr='gte'
    )
    submitted_before = django_filters.DateTimeFilter(
        field_name='submitted_at',
        lookup_expr='lte'
    )
    
    exam_date_after = django_filters.DateTimeFilter(
        field_name='exam_date',
        lookup_expr='gte'
    )
    exam_date_before = django_filters.DateTimeFilter(
        field_name='exam_date',
        lookup_expr='lte'
    )
    
    # Filtros de calificación
    min_score = django_filters.NumberFilter(
        field_name='exam_score',
        lookup_expr='gte'
    )
    max_score = django_filters.NumberFilter(
        field_name='exam_score',
        lookup_expr='lte'
    )
    
    # Filtros booleanos
    has_exam_scheduled = django_filters.BooleanFilter(
        field_name='exam_date',
        lookup_expr='isnull',
        exclude=True
    )
    
    class Meta:
        model = PreEnrollment
        fields = ['status', 'program', 'period', 'student']


class DocumentFilter(django_filters.FilterSet):
    """Filtros para documentos"""
    
    document_type = django_filters.ChoiceFilter(
        choices=Document.DOCUMENT_TYPE_CHOICES
    )
    status = django_filters.ChoiceFilter(choices=Document.STATUS_CHOICES)
    pre_enrollment = django_filters.UUIDFilter(field_name='pre_enrollment__id')
    
    # Filtros de fecha
    uploaded_after = django_filters.DateTimeFilter(
        field_name='uploaded_at',
        lookup_expr='gte'
    )
    uploaded_before = django_filters.DateTimeFilter(
        field_name='uploaded_at',
        lookup_expr='lte'
    )
    
    reviewed_after = django_filters.DateTimeFilter(
        field_name='reviewed_at',
        lookup_expr='gte'
    )
    reviewed_before = django_filters.DateTimeFilter(
        field_name='reviewed_at',
        lookup_expr='lte'
    )
    
    class Meta:
        model = Document
        fields = ['document_type', 'status', 'pre_enrollment']