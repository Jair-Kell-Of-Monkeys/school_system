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


def get_credential_pdf_storage():
    """
    Callable para el campo pdf_file del modelo Credential.

    En producción (Cloudinary activo) usa RawMediaCloudinaryStorage para que
    los PDFs se suban con resource_type='raw' y no queden 'Blocked for delivery'.
    En desarrollo usa FileSystemStorage local.
    """
    from django.conf import settings as _s
    if getattr(_s, 'DEFAULT_FILE_STORAGE', '') == 'cloudinary_storage.storage.MediaCloudinaryStorage':
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        return RawMediaCloudinaryStorage()
    return FileSystemStorage(
        location=os.path.join(_s.MEDIA_ROOT, 'credentials'),
        base_url=f"{_s.MEDIA_URL}credentials/",
    )