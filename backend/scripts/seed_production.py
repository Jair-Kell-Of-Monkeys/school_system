"""
seed_production.py — Datos base para producción
Uso: python manage.py shell < scripts/seed_production.py

Limpia las tablas transaccionales y crea 10 aspirantes de prueba.
"""

import os
import sys
import django
from datetime import date
from django.contrib.auth.hashers import make_password

# ─── Imports de modelos ──────────────────────────────────────────────────────

from apps.users.models import User
from apps.students.models import Student
from apps.credentials.models import Credential, CredentialRequest, CredentialConvocatoria
from apps.enrollments.models import Enrollment, EnrollmentDocument
from apps.exams.models import ExamSession, ExamVenue
from apps.payments.models import Payment
from apps.pre_enrollment.models import PreEnrollment, Document, Announcement

# ─── 1. LIMPIEZA ─────────────────────────────────────────────────────────────

print("=" * 60)
print("LIMPIEZA DE TABLAS TRANSACCIONALES")
print("=" * 60)

deleted_counts = {}

# Credentials (más profundo primero)
n, _ = Credential.objects.all().delete()
deleted_counts['credentials'] = n

n, _ = CredentialRequest.objects.all().delete()
deleted_counts['credential_requests'] = n

n, _ = CredentialConvocatoria.objects.all().delete()
deleted_counts['credential_convocatorias'] = n

# Enrollments
n, _ = EnrollmentDocument.objects.all().delete()
deleted_counts['enrollment_documents'] = n

n, _ = Enrollment.objects.all().delete()
deleted_counts['enrollments'] = n

# Exams
n, _ = ExamVenue.objects.all().delete()
deleted_counts['exam_venues'] = n

n, _ = ExamSession.objects.all().delete()
deleted_counts['exam_sessions'] = n

# Payments
n, _ = Payment.objects.all().delete()
deleted_counts['payments'] = n

# Pre-enrollments y documentos
n, _ = Document.objects.all().delete()
deleted_counts['documents'] = n

n, _ = PreEnrollment.objects.all().delete()
deleted_counts['pre_enrollments'] = n

# Announcements
n, _ = Announcement.objects.all().delete()
deleted_counts['announcements'] = n

# Aspirantes y alumnos (Student se borra en cascada al borrar User)
student_users = User.objects.filter(role__in=['aspirante', 'alumno'])
n = student_users.count()
student_users.delete()
deleted_counts['usuarios_aspirante_alumno'] = n

print("\nRegistros eliminados:")
for table, count in deleted_counts.items():
    status = "✓" if count > 0 else "·"
    print(f"  {status} {table}: {count}")

total_deleted = sum(deleted_counts.values())
print(f"\n  Total eliminado: {total_deleted} registros")

# ─── 2. DATOS DE ASPIRANTES ───────────────────────────────────────────────────

ASPIRANTES = [
    {
        'email': 'aspirante1@gmail.com',
        'first_name': 'Carlos',
        'last_name': 'Hernández',
        'second_last_name': 'Martínez',
        'curp': 'HEMC990315HJCRRR01',
        'date_of_birth': date(1999, 3, 15),
        'gender': 'masculino',
        'phone': '3311234567',
        'city': 'Guadalajara',
        'state': 'Jalisco',
        'previous_school_name': 'Preparatoria #5 SEMS UdG',
        'previous_school_city': 'Guadalajara',
        'previous_school_state': 'Jalisco',
        'education_level': 'preparatoria',
        'graduation_year': 2018,
    },
    {
        'email': 'aspirante2@gmail.com',
        'first_name': 'Ana Sofía',
        'last_name': 'López',
        'second_last_name': 'Ramírez',
        'curp': 'LORA000722MDFPMN02',
        'date_of_birth': date(2000, 7, 22),
        'gender': 'femenino',
        'phone': '5512345678',
        'city': 'Ciudad de México',
        'state': 'Ciudad de México',
        'previous_school_name': 'CCH Plantel Sur UNAM',
        'previous_school_city': 'Ciudad de México',
        'previous_school_state': 'Ciudad de México',
        'education_level': 'bachillerato',
        'graduation_year': 2019,
    },
    {
        'email': 'aspirante3@gmail.com',
        'first_name': 'Miguel',
        'last_name': 'García',
        'second_last_name': 'Torres',
        'curp': 'GATM981108HNLRRG03',
        'date_of_birth': date(1998, 11, 8),
        'gender': 'masculino',
        'phone': '8112345678',
        'city': 'Monterrey',
        'state': 'Nuevo León',
        'previous_school_name': 'UANL Preparatoria 15',
        'previous_school_city': 'Monterrey',
        'previous_school_state': 'Nuevo León',
        'education_level': 'preparatoria',
        'graduation_year': 2017,
    },
    {
        'email': 'aspirante4@gmail.com',
        'first_name': 'Valeria',
        'last_name': 'Mendoza',
        'second_last_name': 'Flores',
        'curp': 'MEFV010430MPLNLL04',
        'date_of_birth': date(2001, 4, 30),
        'gender': 'femenino',
        'phone': '2221234567',
        'city': 'Puebla',
        'state': 'Puebla',
        'previous_school_name': 'Preparatoria BUAP Plantel Centro',
        'previous_school_city': 'Puebla',
        'previous_school_state': 'Puebla',
        'education_level': 'preparatoria',
        'graduation_year': 2020,
    },
    {
        'email': 'aspirante5@gmail.com',
        'first_name': 'Juan Pablo',
        'last_name': 'Rodríguez',
        'second_last_name': 'Sánchez',
        'curp': 'ROSJ970912HVZDNN05',
        'date_of_birth': date(1997, 9, 12),
        'gender': 'masculino',
        'phone': '2291234567',
        'city': 'Xalapa',
        'state': 'Veracruz',
        'previous_school_name': 'Prepa 2 UV Xalapa',
        'previous_school_city': 'Xalapa',
        'previous_school_state': 'Veracruz',
        'education_level': 'preparatoria',
        'graduation_year': 2016,
    },
    {
        'email': 'aspirante6@gmail.com',
        'first_name': 'Daniela',
        'last_name': 'Morales',
        'second_last_name': 'Castro',
        'curp': 'MOCD020105MJCRSN06',
        'date_of_birth': date(2002, 1, 5),
        'gender': 'femenino',
        'phone': '3331234567',
        'city': 'Zapopan',
        'state': 'Jalisco',
        'previous_school_name': 'Prepa ITESO',
        'previous_school_city': 'Guadalajara',
        'previous_school_state': 'Jalisco',
        'education_level': 'bachillerato',
        'graduation_year': 2021,
    },
    {
        'email': 'aspirante7@gmail.com',
        'first_name': 'Alejandro',
        'last_name': 'Jiménez',
        'second_last_name': 'Vargas',
        'curp': 'JIVA990618HGTMRL07',
        'date_of_birth': date(1999, 6, 18),
        'gender': 'masculino',
        'phone': '4771234567',
        'city': 'León',
        'state': 'Guanajuato',
        'previous_school_name': 'Preparatoria de la Universidad de Guanajuato',
        'previous_school_city': 'Guanajuato',
        'previous_school_state': 'Guanajuato',
        'education_level': 'preparatoria',
        'graduation_year': 2018,
    },
    {
        'email': 'aspirante8@gmail.com',
        'first_name': 'Fernanda',
        'last_name': 'Cruz',
        'second_last_name': 'Reyes',
        'curp': 'CURF001225MSRRYR08',
        'date_of_birth': date(2000, 12, 25),
        'gender': 'femenino',
        'phone': '6621234567',
        'city': 'Hermosillo',
        'state': 'Sonora',
        'previous_school_name': 'Preparatoria Lázaro Cárdenas UniSon',
        'previous_school_city': 'Hermosillo',
        'previous_school_state': 'Sonora',
        'education_level': 'preparatoria',
        'graduation_year': 2019,
    },
    {
        'email': 'aspirante9@gmail.com',
        'first_name': 'Luis Eduardo',
        'last_name': 'Díaz',
        'second_last_name': 'Ortega',
        'curp': 'DIOL010803HCHZRS09',
        'date_of_birth': date(2001, 8, 3),
        'gender': 'masculino',
        'phone': '6141234567',
        'city': 'Chihuahua',
        'state': 'Chihuahua',
        'previous_school_name': 'CONALEP Chihuahua I',
        'previous_school_city': 'Chihuahua',
        'previous_school_state': 'Chihuahua',
        'education_level': 'tecnico',
        'graduation_year': 2020,
    },
    {
        'email': 'aspirante10@gmail.com',
        'first_name': 'Gabriela',
        'last_name': 'Vázquez',
        'second_last_name': 'Moreno',
        'curp': 'VAMG980517MMNZRB00',
        'date_of_birth': date(1998, 5, 17),
        'gender': 'femenino',
        'phone': '4431234567',
        'city': 'Morelia',
        'state': 'Michoacán',
        'previous_school_name': 'Escuela Preparatoria UMSNH',
        'previous_school_city': 'Morelia',
        'previous_school_state': 'Michoacán',
        'education_level': 'preparatoria',
        'graduation_year': 2017,
    },
]

# ─── 3. CREACIÓN ──────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("CREACIÓN DE ASPIRANTES")
print("=" * 60)

hashed_password = make_password('password123')
created_users = []
created_students = []
errors = []

for data in ASPIRANTES:
    email = data['email']

    # Verificar que no exista
    if User.objects.filter(email=email).exists():
        errors.append(f"  ! {email} ya existe — omitido")
        continue
    if Student.objects.filter(curp=data['curp']).exists():
        errors.append(f"  ! CURP {data['curp']} ya existe — omitido")
        continue

    # Crear usuario
    user = User(
        email=email,
        password=hashed_password,
        role='aspirante',
        is_active=True,
        is_staff=False,
        is_superuser=False,
    )
    user.save()
    created_users.append(user)

    # Crear perfil de estudiante
    student = Student(
        user=user,
        first_name=data['first_name'],
        last_name=data['last_name'],
        second_last_name=data.get('second_last_name', ''),
        curp=data['curp'],
        date_of_birth=data['date_of_birth'],
        gender=data['gender'],
        phone=data.get('phone', ''),
        email=email,
        city=data.get('city', ''),
        state=data.get('state', ''),
        previous_school_name=data.get('previous_school_name', ''),
        previous_school_city=data.get('previous_school_city', ''),
        previous_school_state=data.get('previous_school_state', ''),
        education_level=data.get('education_level', 'preparatoria'),
        graduation_year=data.get('graduation_year'),
    )
    student.save()
    created_students.append(student)

    print(f"  ✓ {data['first_name']} {data['last_name']} {data.get('second_last_name', '')} — {email}")

if errors:
    print("\nOmitidos:")
    for e in errors:
        print(e)

# ─── 4. RESUMEN FINAL ─────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("RESUMEN FINAL")
print("=" * 60)
print(f"  Tablas limpiadas:   {len(deleted_counts)}")
print(f"  Registros borrados: {total_deleted}")
print(f"  Usuarios creados:   {len(created_users)}")
print(f"  Estudiantes creados:{len(created_students)}")
print(f"  Errores/omitidos:   {len(errors)}")
print()
print("  Credenciales de acceso para todos los aspirantes:")
print("    Contraseña: password123")
print("    Emails: aspirante1@gmail.com ... aspirante10@gmail.com")
print("=" * 60)
