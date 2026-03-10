# apps/academic/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import AcademicPeriod, AcademicProgram


@admin.register(AcademicPeriod)
class AcademicPeriodAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'start_date',
        'end_date',
        'enrollment_period',
        'is_active_badge',
        'is_current_badge',
        'is_enrollment_open_badge',
        'created_at',
    ]
    list_filter = ['is_active', 'start_date', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'is_active')
        }),
        ('Periodo Académico', {
            'fields': ('start_date', 'end_date')
        }),
        ('Periodo de Inscripciones', {
            'fields': ('enrollment_start', 'enrollment_end')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def enrollment_period(self, obj):
        return f"{obj.enrollment_start} - {obj.enrollment_end}"
    enrollment_period.short_description = 'Periodo de Inscripciones'
    
    def is_active_badge(self, obj):
        color = 'green' if obj.is_active else 'gray'
        text = 'Sí' if obj.is_active else 'No'
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, text
        )
    is_active_badge.short_description = 'Activo'
    
    def is_current_badge(self, obj):
        color = 'blue' if obj.is_current else 'gray'
        text = 'En curso' if obj.is_current else 'No'
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, text
        )
    is_current_badge.short_description = 'En Curso'
    
    def is_enrollment_open_badge(self, obj):
        color = 'orange' if obj.is_enrollment_open else 'gray'
        text = 'Abiertas' if obj.is_enrollment_open else 'Cerradas'
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, text
        )
    is_enrollment_open_badge.short_description = 'Inscripciones'


@admin.register(AcademicProgram)
class AcademicProgramAdmin(admin.ModelAdmin):
    list_display = [
        'code',
        'name',
        'duration',
        'max_capacity',
        'is_active_badge',
        'created_at',
    ]
    list_filter = ['is_active', 'duration', 'created_at']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'code', 'is_active')
        }),
        ('Detalles del Programa', {
            'fields': ('description', 'duration', 'max_capacity')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_active_badge(self, obj):
        color = 'green' if obj.is_active else 'red'
        text = 'Activo' if obj.is_active else 'Inactivo'
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, text
        )
    is_active_badge.short_description = 'Estado'