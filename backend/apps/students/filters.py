# apps/students/filters.py
import django_filters
from .models import Student


class StudentFilter(django_filters.FilterSet):
    """Filtros para estudiantes"""
    
    # Filtros de texto
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    curp = django_filters.CharFilter(lookup_expr='iexact')
    
    # Filtros de selección
    gender = django_filters.ChoiceFilter(choices=Student.GENDER_CHOICES)
    education_level = django_filters.ChoiceFilter(
        choices=Student.EDUCATION_LEVEL_CHOICES
    )
    photo_status = django_filters.ChoiceFilter(
        choices=Student.PHOTO_STATUS_CHOICES
    )
    
    # Filtros de ubicación
    city = django_filters.CharFilter(lookup_expr='icontains')
    state = django_filters.CharFilter(lookup_expr='icontains')
    
    # Filtros de fecha
    created_after = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='gte'
    )
    created_before = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='lte'
    )
    date_of_birth_after = django_filters.DateFilter(
        field_name='date_of_birth',
        lookup_expr='gte'
    )
    date_of_birth_before = django_filters.DateFilter(
        field_name='date_of_birth',
        lookup_expr='lte'
    )
    
    # Filtros booleanos
    has_photo = django_filters.BooleanFilter(
        field_name='photo',
        lookup_expr='isnull',
        exclude=True
    )
    has_institutional_email = django_filters.BooleanFilter(
        field_name='institutional_email',
        lookup_expr='isnull',
        exclude=True
    )
    
    class Meta:
        model = Student
        fields = [
            'gender',
            'education_level',
            'photo_status',
            'city',
            'state',
        ]