# core/utils.py
"""
Utilidades comunes para todo el proyecto
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from django.utils import timezone


def generate_unique_code(prefix='', length=8):
    """
    Genera un código único.
    
    Args:
        prefix: Prefijo opcional
        length: Longitud del código (sin contar el prefijo)
    
    Returns:
        str: Código único generado
    """
    unique_id = uuid.uuid4().hex[:length].upper()
    return f"{prefix}{unique_id}" if prefix else unique_id


def generate_qr_code(data):
    """
    Genera hash SHA256 para código QR.
    
    Args:
        data: Datos a hashear
    
    Returns:
        str: Hash generado
    """
    return hashlib.sha256(str(data).encode()).hexdigest()


def get_credential_expiry_date(years=1):
    """
    Calcula fecha de expiración de credencial.
    
    Args:
        years: Años de vigencia
    
    Returns:
        date: Fecha de expiración
    """
    return (timezone.now() + timedelta(days=365*years)).date()


def format_matricula(period_name, program_code, sequential_number):
    """
    Formatea matrícula en el formato estándar.
    Formato: AÑOPERIODOPROGRAMANUMERO
    Ejemplo: 2026AISC000001
    
    Args:
        period_name: Nombre del periodo (ej: "2026-A")
        program_code: Código del programa (ej: "ISC")
        sequential_number: Número secuencial
    
    Returns:
        str: Matrícula formateada
    """
    year = period_name.split('-')[0]
    period_suffix = period_name.split('-')[1]
    
    return f"{year}{period_suffix}{program_code}{str(sequential_number).zfill(6)}"


def format_institutional_email(matricula, domain='universidad.edu.mx'):
    """
    Genera email institucional a partir de matrícula.
    
    Args:
        matricula: Matrícula del alumno
        domain: Dominio del email
    
    Returns:
        str: Email institucional
    """
    return f"{matricula}@{domain}"


def validate_curp_format(curp):
    """
    Valida formato básico de CURP mexicana.
    
    Args:
        curp: CURP a validar
    
    Returns:
        bool: True si es válida
    """
    import re
    pattern = r'^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$'
    return bool(re.match(pattern, curp))


def get_file_extension(filename):
    """
    Obtiene extensión de un archivo.
    
    Args:
        filename: Nombre del archivo
    
    Returns:
        str: Extensión (sin el punto)
    """
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''


def validate_file_size(file_obj, max_size_mb=5):
    """
    Valida que un archivo no exceda el tamaño máximo.
    
    Args:
        file_obj: Archivo a validar
        max_size_mb: Tamaño máximo en MB
    
    Returns:
        bool: True si es válido
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_obj.size <= max_size_bytes


def sanitize_filename(filename):
    """
    Sanitiza nombre de archivo para evitar problemas.
    
    Args:
        filename: Nombre original del archivo
    
    Returns:
        str: Nombre sanitizado
    """
    import re
    # Remover caracteres especiales
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Reemplazar espacios por guiones bajos
    filename = filename.replace(' ', '_')
    # Convertir a minúsculas
    filename = filename.lower()
    return filename


def calculate_age(date_of_birth):
    """
    Calcula la edad a partir de una fecha de nacimiento.
    
    Args:
        date_of_birth: Fecha de nacimiento (date object)
    
    Returns:
        int: Edad en años
    """
    today = timezone.now().date()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )