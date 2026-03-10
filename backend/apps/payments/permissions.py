# apps/payments/permissions.py
from rest_framework.permissions import BasePermission

FINANCE_ROLES = ['admin', 'finanzas']
STAFF_ROLES = ['admin', 'servicios_escolares_jefe', 'servicios_escolares', 'finanzas']


class IsFinanzasOrAdmin(BasePermission):
    """Solo admin y finanzas pueden validar/rechazar pagos."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in FINANCE_ROLES
        )


class IsOwnerOrFinanzas(BasePermission):
    """Staff o el aspirante dueño del pre_enrollment pueden acceder."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role in STAFF_ROLES:
            return True
        # El aspirante dueño del pre_enrollment
        return obj.pre_enrollment.student.user == request.user
