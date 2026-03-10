# core/permissions.py
"""
Permisos personalizados para el sistema
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permiso para administradores únicamente.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsServiciosEscolares(permissions.BasePermission):
    """
    Permiso para Servicios Escolares y Admins.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'servicios_escolares']


class IsFinanzas(permissions.BasePermission):
    """
    Permiso para Finanzas y Admins.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'finanzas']


class IsVinculacion(permissions.BasePermission):
    """
    Permiso para Vinculación y Admins.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'vinculacion']


class IsAspirante(permissions.BasePermission):
    """
    Permiso para Aspirantes únicamente.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'aspirante'


class IsAlumno(permissions.BasePermission):
    """
    Permiso para Alumnos únicamente.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'alumno'


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permiso para el dueño del objeto o staff (admin, servicios escolares, finanzas).
    """
    def has_object_permission(self, request, view, obj):
        # Staff tiene acceso a todo
        if request.user.role in ['admin', 'servicios_escolares', 'finanzas']:
            return True
        
        # Verificar si el objeto pertenece al usuario
        if hasattr(obj, 'student'):
            return obj.student.user == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class IsOwner(permissions.BasePermission):
    """
    Permiso solo para el dueño del objeto.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'student'):
            return obj.student.user == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class ReadOnly(permissions.BasePermission):
    """
    Permiso de solo lectura.
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS