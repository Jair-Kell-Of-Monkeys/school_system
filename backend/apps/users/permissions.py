# apps/users/permissions.py
from rest_framework import permissions

class IsServiciosEscolaresJefe(permissions.BasePermission):
    """Solo jefe de servicios escolares"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'servicios_escolares_jefe']
        )


class HasProgramAccess(permissions.BasePermission):
    """Verifica acceso al programa del recurso"""
    
    def has_object_permission(self, request, view, obj):
        # Admin y jefe tienen acceso total
        if request.user.role in ['admin', 'servicios_escolares_jefe']:
            return True
        
        # Obtener el programa del objeto
        program = None
        if hasattr(obj, 'program'):
            program = obj.program
        elif hasattr(obj, 'pre_enrollment'):
            program = obj.pre_enrollment.program
        elif hasattr(obj, 'enrollment'):
            program = obj.enrollment.program
        
        if program:
            return request.user.has_program_access(program)
        
        return False