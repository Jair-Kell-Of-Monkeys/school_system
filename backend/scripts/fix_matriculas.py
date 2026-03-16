"""
Script para corregir matrículas existentes al formato: YYYYMM + 3 dígitos aleatorios.
Actualiza también el correo institucional: {matricula}@{INSTITUTIONAL_EMAIL_DOMAIN}.

Ejecutar con:
    python manage.py shell < scripts/fix_matriculas.py

O desde el directorio backend:
    DJANGO_SETTINGS_MODULE=config.settings.development python manage.py shell < scripts/fix_matriculas.py
"""

import random
from datetime import datetime
from django.conf import settings
from apps.enrollments.models import Enrollment

domain = getattr(settings, 'INSTITUTIONAL_EMAIL_DOMAIN', 'universidad.edu.mx')
now = datetime.now()

enrollments = list(Enrollment.objects.select_related('student').all().order_by('created_at'))
print(f"Total inscripciones a procesar: {len(enrollments)}")
print("-" * 60)

updated = 0
errors = 0

for enrollment in enrollments:
    old_matricula = enrollment.matricula

    # Generar nueva matrícula única con formato YYYYMM + NNN
    new_matricula = None
    for _ in range(200):
        digits = f"{random.randint(0, 999):03d}"
        candidate = f"{now.year}{now.month:02d}{digits}"
        if not Enrollment.objects.filter(matricula=candidate).exclude(pk=enrollment.pk).exists():
            new_matricula = candidate
            break

    if not new_matricula:
        print(f"ERROR: No se pudo generar matrícula única para enrollment {enrollment.pk}")
        errors += 1
        continue

    # Actualizar matrícula
    enrollment.matricula = new_matricula
    enrollment.save(update_fields=['matricula'])

    # Actualizar correo institucional del estudiante
    student = enrollment.student
    new_email = f"{new_matricula}@{domain}"
    student.institutional_email = new_email
    student.save(update_fields=['institutional_email'])

    print(f"  {old_matricula} → {new_matricula} | {new_email}")
    updated += 1

print("-" * 60)
print(f"Completado: {updated} actualizados, {errors} errores.")
