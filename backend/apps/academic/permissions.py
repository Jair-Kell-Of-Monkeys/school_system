# apps/academic/permissions.py
from rest_framework import permissions


class IsAdminOrServiciosEscolares(permissions.BasePermission):
    """
    Permiso para Admin o personal de Servicios Escolares
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'servicios_escolares', 'servicios_escolares_jefe']
        )