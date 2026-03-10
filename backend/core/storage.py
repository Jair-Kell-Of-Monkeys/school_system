# core/storage.py
"""
Configuración de almacenamiento de archivos
"""

from django.core.files.storage import FileSystemStorage
from django.conf import settings
import os


class DocumentStorage(FileSystemStorage):
    """
    Almacenamiento para documentos de pre-inscripción
    """
    def __init__(self):
        super().__init__(
            location=os.path.join(settings.MEDIA_ROOT, 'documents'),
            base_url=f"{settings.MEDIA_URL}documents/"
        )


class PhotoStorage(FileSystemStorage):
    """
    Almacenamiento para fotografías de estudiantes
    """
    def __init__(self):
        super().__init__(
            location=os.path.join(settings.MEDIA_ROOT, 'photos'),
            base_url=f"{settings.MEDIA_URL}photos/"
        )


class PaymentSlipStorage(FileSystemStorage):
    """
    Almacenamiento para fichas de pago generadas
    """
    def __init__(self):
        super().__init__(
            location=os.path.join(settings.MEDIA_ROOT, 'payment_slips'),
            base_url=f"{settings.MEDIA_URL}payment_slips/"
        )


class PaymentProofStorage(FileSystemStorage):
    """
    Almacenamiento para comprobantes de pago subidos
    """
    def __init__(self):
        super().__init__(
            location=os.path.join(settings.MEDIA_ROOT, 'payment_proofs'),
            base_url=f"{settings.MEDIA_URL}payment_proofs/"
        )


class CredentialStorage(FileSystemStorage):
    """
    Almacenamiento para credenciales generadas
    """
    def __init__(self):
        super().__init__(
            location=os.path.join(settings.MEDIA_ROOT, 'credentials'),
            base_url=f"{settings.MEDIA_URL}credentials/"
        )