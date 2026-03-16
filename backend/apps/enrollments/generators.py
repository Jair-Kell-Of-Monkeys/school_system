# apps/enrollments/generators.py
import random
import unicodedata
import re
from datetime import datetime
from django.conf import settings


def _normalize(s):
    """Elimina acentos y caracteres no alfabéticos, convierte a minúsculas."""
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-zA-Z]', '', s).lower()


def generate_matricula(program_code, period_year=None):
    """
    Genera una matrícula única con formato: {YEAR}{MONTH}{NNN}
    donde YEAR y MONTH son el año y mes actuales, y NNN son 3 dígitos aleatorios.
    Reintenta hasta obtener un valor único (máx. 200 intentos).

    Ejemplo: si se inscribe en abril 2026 → 202604381
    """
    from apps.enrollments.models import Enrollment

    now = datetime.now()
    prefix = f"{now.year}{now.month:02d}"

    for _ in range(200):
        digits = f"{random.randint(0, 999):03d}"
        matricula = f"{prefix}{digits}"
        if not Enrollment.objects.filter(matricula=matricula).exists():
            return matricula

    raise ValueError(
        f"No se pudo generar una matrícula única con el prefijo '{prefix}' "
        "después de 200 intentos"
    )


def generate_institutional_email(student):
    """
    Genera un correo institucional único: {inicial}{apellido}@{dominio}
    Si hay colisión agrega sufijo numérico incremental.

    El dominio se toma de settings.INSTITUTIONAL_EMAIL_DOMAIN.
    El resultado se guarda en student.institutional_email (se persiste externamente).

    Ejemplo: jgomez@universidad.edu.mx, jgomez1@universidad.edu.mx
    """
    from apps.students.models import Student

    domain = getattr(settings, 'INSTITUTIONAL_EMAIL_DOMAIN', 'universidad.edu.mx')

    first_initial = _normalize(student.first_name)[0] if student.first_name else 'x'
    last_name_clean = _normalize(student.last_name) if student.last_name else 'alumno'
    base = f"{first_initial}{last_name_clean}"

    # Intentar sin sufijo primero, luego con sufijos 1..999
    candidates = [base] + [f"{base}{i}" for i in range(1, 1000)]
    for candidate in candidates:
        email = f"{candidate}@{domain}"
        if not Student.objects.filter(institutional_email=email).exclude(pk=student.pk).exists():
            return email

    raise ValueError(
        f"No se pudo generar un correo institucional único para el estudiante {student.pk}"
    )
