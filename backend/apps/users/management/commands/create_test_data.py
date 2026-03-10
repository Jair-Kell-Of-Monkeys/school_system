# apps/users/management/commands/create_test_data.py
"""
Comando para crear datos de prueba del sistema universitario.

Uso:
    python manage.py create_test_data
    python manage.py create_test_data --clean  (elimina datos anteriores)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta, date
import random

from apps.users.models import User, UserProgramPermission
from apps.academic.models import AcademicPeriod, AcademicProgram
from apps.students.models import Student
from apps.pre_enrollment.models import PreEnrollment, Document, Announcement


class Command(BaseCommand):
    help = 'Crea datos de prueba para el sistema universitario'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Elimina datos de prueba anteriores',
        )

    def handle(self, *args, **options):
        if options['clean']:
            self.stdout.write(self.style.WARNING('Limpiando datos anteriores...'))
            self.clean_data()
        
        self.stdout.write(self.style.SUCCESS('Iniciando creación de datos de prueba...'))
        
        try:
            with transaction.atomic():
                # 1. Crear usuarios del staff
                self.stdout.write('1. Creando usuarios del staff...')
                users = self.create_staff_users()
                
                # 2. Crear periodos académicos
                self.stdout.write('2. Creando periodos académicos...')
                periods = self.create_academic_periods()
                
                # 3. Crear programas académicos
                self.stdout.write('3. Creando programas académicos...')
                programs = self.create_academic_programs()
                
                # 4. Asignar programas a encargados
                self.stdout.write('4. Asignando programas a encargados...')
                self.assign_programs_to_staff(users, programs)
                
                # 5. Crear convocatorias
                self.stdout.write('5. Creando convocatorias...')
                announcements = self.create_announcements(periods)
                
                # 6. Crear aspirantes
                self.stdout.write('6. Creando aspirantes y estudiantes...')
                students = self.create_students()
                
                # 7. Crear pre-inscripciones
                self.stdout.write('7. Creando pre-inscripciones...')
                pre_enrollments = self.create_pre_enrollments(students, programs, periods)
                
                self.stdout.write(self.style.SUCCESS('\n✓ Datos de prueba creados exitosamente!\n'))
                self.print_summary(users, periods, programs, students, pre_enrollments)
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error al crear datos: {str(e)}'))
            raise

    def clean_data(self):
        """Elimina datos de prueba anteriores"""
        # Eliminar en orden inverso por dependencias
        PreEnrollment.objects.all().delete()
        Document.objects.all().delete()
        Announcement.objects.all().delete()
        Student.objects.exclude(user__email='admin@universidad.edu.mx').delete()
        UserProgramPermission.objects.all().delete()
        User.objects.exclude(email='admin@universidad.edu.mx').delete()
        AcademicProgram.objects.all().delete()
        AcademicPeriod.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('✓ Datos anteriores eliminados'))

    def create_staff_users(self):
        """Crea usuarios del personal"""
        users = {}
        
        # Jefa de Servicios Escolares
        users['jefa'] = User.objects.create_user(
            email='jefa.escolares@universidad.edu.mx',
            password='password123',
            role='servicios_escolares_jefe',
            is_staff=True,
            is_active=True
        )
        
        # Encargados de Servicios Escolares
        users['encargado_tics'] = User.objects.create_user(
            email='encargado.tics@universidad.edu.mx',
            password='password123',
            role='servicios_escolares',
            is_staff=True,
            is_active=True
        )
        
        users['encargado_gastro'] = User.objects.create_user(
            email='encargado.gastronomia@universidad.edu.mx',
            password='password123',
            role='servicios_escolares',
            is_staff=True,
            is_active=True
        )
        
        users['encargado_negocios'] = User.objects.create_user(
            email='encargado.negocios@universidad.edu.mx',
            password='password123',
            role='servicios_escolares',
            is_staff=True,
            is_active=True
        )
        
        # Finanzas
        users['finanzas'] = User.objects.create_user(
            email='finanzas@universidad.edu.mx',
            password='password123',
            role='finanzas',
            is_staff=True,
            is_active=True
        )
        
        # Vinculación
        users['vinculacion'] = User.objects.create_user(
            email='vinculacion@universidad.edu.mx',
            password='password123',
            role='vinculacion',
            is_staff=True,
            is_active=True
        )
        
        self.stdout.write(f'  ✓ {len(users)} usuarios del staff creados')
        return users

    def create_academic_periods(self):
        """Crea periodos académicos"""
        periods = []
        
        # Periodo 2026-A (activo)
        period_2026a = AcademicPeriod.objects.create(
            name='2026-A',
            start_date=date(2026, 1, 13),
            end_date=date(2026, 5, 8),
            enrollment_start=date(2026, 1, 6),
            enrollment_end=date(2026, 1, 17),
            is_active=True
        )
        periods.append(period_2026a)
        
        # Periodo 2026-B
        period_2026b = AcademicPeriod.objects.create(
            name='2026-B',
            start_date=date(2026, 5, 18),
            end_date=date(2026, 9, 11),
            enrollment_start=date(2026, 5, 11),
            enrollment_end=date(2026, 5, 22),
            is_active=False
        )
        periods.append(period_2026b)
        
        # Periodo 2025-B (pasado)
        period_2025b = AcademicPeriod.objects.create(
            name='2025-B',
            start_date=date(2025, 9, 16),
            end_date=date(2026, 1, 10),
            enrollment_start=date(2025, 9, 9),
            enrollment_end=date(2025, 9, 20),
            is_active=False
        )
        periods.append(period_2025b)
        
        self.stdout.write(f'  ✓ {len(periods)} periodos académicos creados')
        return periods

    def create_academic_programs(self):
        """Crea programas académicos (carreras)"""
        programs_data = [
            {
                'name': 'Ingeniería en Sistemas Computacionales',
                'code': 'ISC',
                'description': 'Forma profesionales capaces de diseñar, desarrollar e implementar sistemas computacionales.',
                'duration': 11,
                'max_capacity': 35
            },
            {
                'name': 'Ingeniería en Tecnologías de la Información y Comunicaciones',
                'code': 'TICS',
                'description': 'Profesionales en redes, telecomunicaciones y tecnologías emergentes.',
                'duration': 11,
                'max_capacity': 30
            },
            {
                'name': 'Gastronomía',
                'code': 'GASTRO',
                'description': 'Formación integral en artes culinarias y gestión gastronómica.',
                'duration': 9,
                'max_capacity': 25
            },
            {
                'name': 'Licenciatura en Administración',
                'code': 'LA',
                'description': 'Profesionales en dirección y gestión de empresas.',
                'duration': 9,
                'max_capacity': 30
            },
            {
                'name': 'Licenciatura en Negocios Internacionales',
                'code': 'LNI',
                'description': 'Especialistas en comercio internacional y negocios globales.',
                'duration': 9,
                'max_capacity': 25
            },
        ]
        
        programs = []
        for data in programs_data:
            program = AcademicProgram.objects.create(**data)
            programs.append(program)
        
        self.stdout.write(f'  ✓ {len(programs)} programas académicos creados')
        return programs

    def assign_programs_to_staff(self, users, programs):
        """Asigna programas a encargados de servicios escolares"""
        assignments = [
            # Encargado de TICS tiene ISC y TICS
            (users['encargado_tics'], ['ISC', 'TICS']),
            # Encargado de Gastronomía
            (users['encargado_gastro'], ['GASTRO']),
            # Encargado de Negocios tiene LA y LNI
            (users['encargado_negocios'], ['LA', 'LNI']),
        ]
        
        count = 0
        for user, program_codes in assignments:
            for code in program_codes:
                program = next(p for p in programs if p.code == code)
                UserProgramPermission.objects.create(
                    user=user,
                    program=program,
                    assigned_by=users['jefa']
                )
                count += 1
        
        self.stdout.write(f'  ✓ {count} asignaciones de programas realizadas')

    def create_announcements(self, periods):
        """Crea convocatorias de admisión"""
        announcements = []
        
        active_period = next(p for p in periods if p.is_active)
        
        announcement = Announcement.objects.create(
            period=active_period,
            title=f'Convocatoria de Admisión {active_period.name}',
            description='Proceso de admisión para nuevo ingreso. Requisitos: Certificado de bachillerato, CURP, acta de nacimiento.',
            published_at=timezone.now() - timedelta(days=30),
            deadline=active_period.enrollment_end,
            is_active=True
        )
        announcements.append(announcement)
        
        self.stdout.write(f'  ✓ {len(announcements)} convocatorias creadas')
        return announcements

    def create_students(self):
        """Crea estudiantes de prueba"""
        students_data = [
            {
                'first_name': 'Juan Carlos',
                'last_name': 'Pérez',
                'curp': 'PEPJ950615HDFRRN01',
                'date_of_birth': date(1995, 6, 15),
                'gender': 'masculino',
                'phone': '7771234567',
                'email': 'juan.perez@email.com',
                'city': 'Cuernavaca',
                'state': 'Morelos',
                'previous_school_name': 'CBTis 123',
                'education_level': 'bachillerato',
                'graduation_year': 2013
            },
            {
                'first_name': 'María Guadalupe',
                'last_name': 'González',
                'curp': 'GOGM980320MDFNRRA5',
                'date_of_birth': date(1998, 3, 20),
                'gender': 'femenino',
                'phone': '7779876543',
                'email': 'maria.gonzalez@email.com',
                'city': 'Jiutepec',
                'state': 'Morelos',
                'previous_school_name': 'Preparatoria Estatal',
                'education_level': 'preparatoria',
                'graduation_year': 2016
            },
            {
                'first_name': 'Carlos Alberto',
                'last_name': 'Ramírez',
                'curp': 'RAMC000512HDFLRR08',
                'date_of_birth': date(2000, 5, 12),
                'gender': 'masculino',
                'phone': '7775551234',
                'email': 'carlos.ramirez@email.com',
                'city': 'Cuautla',
                'state': 'Morelos',
                'previous_school_name': 'Conalep Cuautla',
                'education_level': 'tecnico',
                'graduation_year': 2018
            },
            {
                'first_name': 'Ana Patricia',
                'last_name': 'López',
                'curp': 'LOPA011025MDFPTN04',
                'date_of_birth': date(2001, 10, 25),
                'gender': 'femenino',
                'phone': '7773334455',
                'email': 'ana.lopez@email.com',
                'city': 'Temixco',
                'state': 'Morelos',
                'previous_school_name': 'Bachillerato Tecnológico',
                'education_level': 'bachillerato',
                'graduation_year': 2019
            },
            {
                'first_name': 'Luis Fernando',
                'last_name': 'Martínez',
                'curp': 'MAML991108HDFRRS02',
                'date_of_birth': date(1999, 11, 8),
                'gender': 'masculino',
                'phone': '7772223344',
                'email': 'luis.martinez@email.com',
                'city': 'Yautepec',
                'state': 'Morelos',
                'previous_school_name': 'CBT Yautepec',
                'education_level': 'tecnico',
                'graduation_year': 2017
            },
        ]
        
        students = []
        for i, data in enumerate(students_data):
            # Crear usuario
            user = User.objects.create_user(
                email=data['email'],
                password='password123',
                role='aspirante',
                is_active=True
            )
            
            # Crear estudiante
            student = Student.objects.create(
                user=user,
                **data
            )
            students.append(student)
        
        self.stdout.write(f'  ✓ {len(students)} estudiantes creados')
        return students

    def create_pre_enrollments(self, students, programs, periods):
        """Crea pre-inscripciones de prueba en diferentes estados"""
        active_period = next(p for p in periods if p.is_active)
        
        pre_enrollments = []
        
        # Estados a crear
        states = [
            ('draft', 'Borrador'),
            ('submitted', 'Enviado'),
            ('under_review', 'En revisión'),
            ('documents_approved', 'Documentos aprobados'),
            ('payment_validated', 'Pago validado'),
        ]
        
        for i, student in enumerate(students[:5]):
            # Asignar programa aleatoriamente
            program = random.choice(programs)
            
            # Asignar estado según el índice
            status = states[i][0]
            
            pre_enrollment = PreEnrollment.objects.create(
                student=student,
                program=program,
                period=active_period,
                status=status,
                submitted_at=timezone.now() - timedelta(days=random.randint(5, 20)) if status != 'draft' else None,
                notes=f'Pre-inscripción de prueba en estado: {states[i][1]}'
            )
            pre_enrollments.append(pre_enrollment)
        
        self.stdout.write(f'  ✓ {len(pre_enrollments)} pre-inscripciones creadas')
        return pre_enrollments

    def print_summary(self, users, periods, programs, students, pre_enrollments):
        """Imprime resumen de datos creados"""
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('RESUMEN DE DATOS CREADOS'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        self.stdout.write('\n📋 USUARIOS DEL STAFF:')
        self.stdout.write(f'  • Jefa Servicios Escolares: jefa.escolares@universidad.edu.mx')
        self.stdout.write(f'  • Encargado TICS: encargado.tics@universidad.edu.mx')
        self.stdout.write(f'  • Encargado Gastronomía: encargado.gastronomia@universidad.edu.mx')
        self.stdout.write(f'  • Encargado Negocios: encargado.negocios@universidad.edu.mx')
        self.stdout.write(f'  • Finanzas: finanzas@universidad.edu.mx')
        self.stdout.write(f'  • Vinculación: vinculacion@universidad.edu.mx')
        self.stdout.write(f'  Contraseña para todos: password123')
        
        self.stdout.write('\n📅 PERIODOS ACADÉMICOS:')
        for period in periods:
            status = '✓ ACTIVO' if period.is_active else '  inactivo'
            self.stdout.write(f'  {status} {period.name}: {period.start_date} al {period.end_date}')
        
        self.stdout.write('\n🎓 PROGRAMAS ACADÉMICOS:')
        for program in programs:
            self.stdout.write(f'  • {program.code}: {program.name}')
        
        self.stdout.write('\n👥 ESTUDIANTES/ASPIRANTES:')
        for student in students:
            self.stdout.write(f'  • {student.get_full_name()}: {student.user.email}')
        
        self.stdout.write('\n📝 PRE-INSCRIPCIONES:')
        for pe in pre_enrollments:
            self.stdout.write(f'  • {pe.student.get_full_name()} → {pe.program.code} ({pe.get_status_display()})')
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('Todos los usuarios tienen la contraseña: password123'))
        self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))