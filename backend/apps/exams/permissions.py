# apps/exams/permissions.py
from rest_framework import permissions

JEFE_ROLES = ['admin', 'servicios_escolares_jefe']
STAFF_ROLES = ['admin', 'servicios_escolares_jefe', 'servicios_escolares']


class IsJefeServicios(permissions.BasePermission):
    """Acceso restringido al Jefe de Servicios Escolares y Admin."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in JEFE_ROLES
        )


class IsEncargadoServicios(permissions.BasePermission):
    """Acceso para cualquier rol de Servicios Escolares (incluyendo jefe)."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in STAFF_ROLES
        )
