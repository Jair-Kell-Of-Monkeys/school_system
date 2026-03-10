# core/middleware.py
"""
Middleware personalizado para el sistema
"""

class AuditMiddleware:
    """
    Middleware para registrar todas las peticiones en audit_logs
    (Implementar más adelante)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response