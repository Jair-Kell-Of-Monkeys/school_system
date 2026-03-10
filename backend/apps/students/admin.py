# apps/students/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = [
        'curp',
        'get_full_name',
        'user_email',
        'institutional_email',
        'gender',
        'photo_status_badge',
        'city',
        'state',
        'created_at',
    ]
    list_filter = [
        'gender',
        'photo_status',
        'education_level',
        'state',
        'created_at',
    ]
    search_fields = [
        'first_name',
        'last_name',
        'curp',
        'user__email',
        'institutional_email',
        'phone',
    ]
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'photo_reviewed_at',
        'display_photo',
    ]
    
    fieldsets = (
        ('Usuario', {
            'fields': ('id', 'user')
        }),
        ('Información Personal', {
            'fields': (
                'first_name',
                'last_name',
                'second_last_name',
                'curp',
                'date_of_birth',
                'gender',
            )
        }),
        ('Contacto', {
            'fields': (
                'phone',
                'email',
                'institutional_email',
            )
        }),
        ('Dirección', {
            'fields': (
                'address',
                'city',
                'state',
                'zip_code',
            ),
            'classes': ('collapse',)
        }),
        ('Escuela de Procedencia', {
            'fields': (
                'previous_school_name',
                'previous_school_city',
                'previous_school_state',
                'education_level',
                'graduation_year',
            ),
            'classes': ('collapse',)
        }),
        ('Fotografía', {
            'fields': (
                'display_photo',
                'photo',
                'photo_status',
                'photo_reviewed_by',
                'photo_reviewed_at',
                'photo_rejection_reason',
            )
        }),
        ('Auditoría', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Nombre Completo'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email Usuario'
    
    def photo_status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red',
        }
        color = colors.get(obj.photo_status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_photo_status_display()
        )
    photo_status_badge.short_description = 'Estado Foto'
    
    def display_photo(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.photo.url
            )
        return "Sin fotografía"
    display_photo.short_description = 'Vista Previa'
    
    actions = ['approve_photos', 'reject_photos']
    
    def approve_photos(self, request, queryset):
        updated = queryset.filter(
            photo_status='pending',
            photo__isnull=False
        ).update(
            photo_status='approved',
            photo_reviewed_by=request.user,
        )
        self.message_user(
            request,
            f'{updated} fotografías aprobadas correctamente.'
        )
    approve_photos.short_description = 'Aprobar fotografías seleccionadas'
    
    def reject_photos(self, request, queryset):
        updated = queryset.filter(
            photo_status='pending',
            photo__isnull=False
        ).update(
            photo_status='rejected',
            photo_reviewed_by=request.user,
        )
        self.message_user(
            request,
            f'{updated} fotografías rechazadas.'
        )
    reject_photos.short_description = 'Rechazar fotografías seleccionadas'