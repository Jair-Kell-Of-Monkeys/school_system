# apps/users/admin.py
"""
Configuración del panel de administración para usuarios.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserProgramPermission


class UserProgramPermissionInline(admin.TabularInline):
    """Inline para asignar programas a usuarios de Servicios Escolares"""
    model = UserProgramPermission
    extra = 1
    readonly_fields = ['assigned_by', 'assigned_at']
    autocomplete_fields = ['program']
    
    def has_add_permission(self, request, obj=None):
        """Solo jefe y admin pueden asignar programas"""
        return request.user.role in ['admin', 'servicios_escolares_jefe']
    
    def has_delete_permission(self, request, obj=None):
        """Solo jefe y admin pueden remover programas"""
        return request.user.role in ['admin', 'servicios_escolares_jefe']
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Auto-asignar el usuario que asigna el programa"""
        if db_field.name == "assigned_by":
            kwargs["initial"] = request.user.id
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Panel de administración para usuarios.
    """
    
    list_display = [
        'email',
        'role_badge',
        'is_active_badge',
        'get_assigned_programs',
        'date_joined'
    ]
    list_filter = ['role', 'is_active', 'is_staff', 'date_joined']
    search_fields = ['email']
    ordering = ['-date_joined']
    
    readonly_fields = [
        'id',
        'date_joined',
        'last_login',
        'created_at',
        'updated_at'
    ]
    
    # Configuración de fieldsets para el formulario de edición
    fieldsets = (
        ('Información de Cuenta', {
            'fields': ('id', 'email', 'password')
        }),
        ('Información de Rol', {
            'fields': ('role', 'is_active')
        }),
        ('Permisos de Django', {
            'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Fechas Importantes', {
            'fields': ('date_joined', 'last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Configuración para crear nuevo usuario
    add_fieldsets = (
        ('Crear Nuevo Usuario', {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'is_active'),
        }),
    )
    
    # Inline para asignar programas
    inlines = []
    
    def get_inlines(self, request, obj):
        """Mostrar inline solo para servicios_escolares"""
        if obj and obj.role == 'servicios_escolares':
            return [UserProgramPermissionInline]
        return []
    
    def role_badge(self, obj):
        """Badge con color según el rol"""
        colors = {
            'admin': '#dc3545',
            'servicios_escolares_jefe': '#fd7e14',
            'servicios_escolares': '#0dcaf0',
            'finanzas': '#198754',
            'vinculacion': '#6f42c1',
            'aspirante': '#ffc107',
            'alumno': '#0d6efd',
        }
        color = colors.get(obj.role, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 4px 12px; border-radius: 4px; font-weight: 500;">{}</span>',
            color,
            obj.get_role_display_name()
        )
    role_badge.short_description = 'Rol'
    
    def is_active_badge(self, obj):
        """Badge de estado activo/inactivo"""
        if obj.is_active:
            return format_html(
                '<span style="color: #198754; font-weight: bold;">✓ Activo</span>'
            )
        return format_html(
            '<span style="color: #dc3545; font-weight: bold;">✗ Inactivo</span>'
        )
    is_active_badge.short_description = 'Estado'
    
    def get_assigned_programs(self, obj):
        """Mostrar programas asignados"""
        if obj.role == 'servicios_escolares':
            programs = obj.assigned_programs.all()
            if programs:
                codes = [f'<b>{p.code}</b>' for p in programs]
                return format_html(', '.join(codes))
            return format_html('<span style="color: #dc3545;">Sin asignar</span>')
        elif obj.role in ['admin', 'servicios_escolares_jefe']:
            return format_html('<span style="color: #198754;">Todos</span>')
        return '-'
    get_assigned_programs.short_description = 'Programas'
    
    def get_queryset(self, request):
        """Filtrar usuarios según el rol"""
        qs = super().get_queryset(request)
        
        # Jefe de servicios escolares solo ve a sus encargados
        if request.user.role == 'servicios_escolares_jefe':
            return qs.filter(role='servicios_escolares')
        
        return qs
    
    def has_change_permission(self, request, obj=None):
        """Permisos para editar usuarios"""
        if not obj:
            return super().has_change_permission(request, obj)
        
        # Admin puede editar todo
        if request.user.role == 'admin':
            return True
        
        # Jefe solo puede editar a sus encargados
        if request.user.role == 'servicios_escolares_jefe':
            return obj.role == 'servicios_escolares'
        
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Permisos para eliminar usuarios"""
        if not obj:
            return super().has_delete_permission(request, obj)
        
        # Admin puede eliminar todo
        if request.user.role == 'admin':
            return True
        
        # Jefe solo puede eliminar a sus encargados
        if request.user.role == 'servicios_escolares_jefe':
            return obj.role == 'servicios_escolares'
        
        return False


@admin.register(UserProgramPermission)
class UserProgramPermissionAdmin(admin.ModelAdmin):
    """
    Panel de administración para permisos de programas.
    """
    
    list_display = [
        'user',
        'program',
        'assigned_by',
        'assigned_at'
    ]
    list_filter = ['program', 'assigned_at']
    search_fields = [
        'user__email',
        'program__name',
        'program__code'
    ]
    readonly_fields = ['assigned_at']
    autocomplete_fields = ['user', 'program', 'assigned_by']
    
    def get_queryset(self, request):
        """Filtrar permisos según el rol"""
        qs = super().get_queryset(request)
        
        # Jefe solo ve permisos que él asignó
        if request.user.role == 'servicios_escolares_jefe':
            return qs.filter(assigned_by=request.user)
        
        return qs