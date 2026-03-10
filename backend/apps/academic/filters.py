# apps/academic/filters.py
import django_filters
from .models import AcademicPeriod, AcademicProgram


class AcademicPeriodFilter(django_filters.FilterSet):
    """Filtros para periodos académicos"""
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    is_active = django_filters.BooleanFilter()
    
    start_date_after = django_filters.DateFilter(
        field_name='start_date',
        lookup_expr='gte'
    )
    start_date_before = django_filters.DateFilter(
        field_name='start_date',
        lookup_expr='lte'
    )
    
    end_date_after = django_filters.DateFilter(
        field_name='end_date',
        lookup_expr='gte'
    )
    end_date_before = django_filters.DateFilter(
        field_name='end_date',
        lookup_expr='lte'
    )
    
    class Meta:
        model = AcademicPeriod
        fields = ['is_active']


class AcademicProgramFilter(django_filters.FilterSet):
    """Filtros para programas académicos"""
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    code = django_filters.CharFilter(lookup_expr='iexact')
    is_active = django_filters.BooleanFilter()
    duration = django_filters.NumberFilter()
    
    min_capacity = django_filters.NumberFilter(
        field_name='max_capacity',
        lookup_expr='gte'
    )
    max_capacity_filter = django_filters.NumberFilter(
        field_name='max_capacity',
        lookup_expr='lte'
    )
    
    class Meta:
        model = AcademicProgram
        fields = ['is_active', 'duration']