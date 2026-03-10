# apps/students/permissions.py
from rest_framework import permissions


class IsAdminOrServiciosEscolares(permissions.BasePermission):
    """
    Permiso para Admin o personal de Servicios Escolares
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'servicios_escolares']
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permiso para el propietario del perfil o Admin
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin y Servicios Escolares tienen acceso completo
        if request.user.role in ['admin', 'servicios_escolares']:
            return True
        
        # El estudiante solo puede ver su propio perfil
        return obj.user == request.user