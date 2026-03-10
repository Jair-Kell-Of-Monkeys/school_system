# apps/pre_enrollment/permissions.py
from rest_framework import permissions


STAFF_ROLES = ['admin', 'servicios_escolares_jefe', 'servicios_escolares']


class IsAdminOrServiciosEscolares(permissions.BasePermission):
    """
    Permiso para Admin o personal de Servicios Escolares (cualquier nivel)
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in STAFF_ROLES
        )


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permiso para el propietario del recurso o staff
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Staff tiene acceso completo
        if request.user.role in STAFF_ROLES:
            return True
        
        # El estudiante solo puede ver sus propios recursos
        if hasattr(obj, 'student'):
            # Para PreEnrollment
            return obj.student.user == request.user
        elif hasattr(obj, 'pre_enrollment'):
            # Para Document
            return obj.pre_enrollment.student.user == request.user
        
        return False