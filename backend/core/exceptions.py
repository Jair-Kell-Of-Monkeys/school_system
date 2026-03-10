# core/exceptions.py
"""
Excepciones personalizadas y handler para el proyecto
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Handler personalizado para excepciones de Django REST Framework.
    Formatea las respuestas de error de manera consistente.
    """
    # Llamar al handler por defecto primero
    response = exception_handler(exc, context)
    
    if response is not None:
        # Formatear la respuesta de error
        custom_response_data = {
            'error': True,
            'message': None,
            'details': None,
            'status_code': response.status_code
        }
        
        # Extraer mensaje de error
        if isinstance(response.data, dict):
            # Si hay un campo 'detail', usarlo como mensaje principal
            if 'detail' in response.data:
                custom_response_data['message'] = response.data['detail']
                custom_response_data['details'] = {k: v for k, v in response.data.items() if k != 'detail'}
            else:
                # Si hay errores de validación de campos
                custom_response_data['message'] = 'Error de validación'
                custom_response_data['details'] = response.data
        elif isinstance(response.data, list):
            custom_response_data['message'] = response.data[0] if response.data else 'Error'
            custom_response_data['details'] = response.data
        else:
            custom_response_data['message'] = str(response.data)
        
        response.data = custom_response_data
    
    return response


# ============================================================================
# Excepciones personalizadas
# ============================================================================

class ValidationError(Exception):
    """Error de validación de negocio."""
    def __init__(self, message, field=None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class DocumentRejectedError(Exception):
    """Error cuando un documento es rechazado."""
    pass


class PaymentNotValidatedError(Exception):
    """Error cuando se intenta avanzar sin pago validado."""
    pass


class ProgramCapacityError(Exception):
    """Error cuando no hay cupo disponible en el programa."""
    pass


class ExamScoreError(Exception):
    """Error relacionado con calificación de examen."""
    pass


class InvalidStatusTransitionError(Exception):
    """Error cuando se intenta una transición de estado inválida."""
    def __init__(self, current_status, attempted_status):
        self.current_status = current_status
        self.attempted_status = attempted_status
        super().__init__(
            f"No se puede cambiar de '{current_status}' a '{attempted_status}'"
        )