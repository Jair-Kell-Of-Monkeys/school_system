import uuid
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('academic', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ExamSession',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False,
                )),
                ('name', models.CharField(max_length=255, verbose_name='Nombre')),
                ('exam_date', models.DateField(verbose_name='Fecha del Examen')),
                ('exam_time', models.TimeField(verbose_name='Hora del Examen')),
                ('mode', models.CharField(
                    choices=[('presencial', 'Presencial'), ('en_linea', 'En Línea')],
                    default='presencial', max_length=20, verbose_name='Modalidad',
                )),
                ('passing_score', models.IntegerField(
                    default=70,
                    validators=[
                        django.core.validators.MinValueValidator(0),
                        django.core.validators.MaxValueValidator(100),
                    ],
                    verbose_name='Calificación Mínima Aprobatoria',
                )),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Borrador'),
                        ('published', 'Publicado'),
                        ('completed', 'Completado'),
                    ],
                    default='draft', max_length=20, verbose_name='Estado',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('period', models.ForeignKey(
                    db_constraint=False,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='exam_sessions',
                    to='academic.academicperiod',
                    verbose_name='Periodo',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    db_constraint=False,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_exam_sessions',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
            ],
            options={
                'verbose_name': 'Sesión de Examen',
                'verbose_name_plural': 'Sesiones de Examen',
                'db_table': 'exam_sessions',
                'ordering': ['-exam_date'],
            },
        ),
        migrations.CreateModel(
            name='ExamVenue',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False,
                )),
                ('building', models.CharField(max_length=100, verbose_name='Edificio')),
                ('room', models.CharField(max_length=100, verbose_name='Salón')),
                ('capacity', models.IntegerField(
                    validators=[django.core.validators.MinValueValidator(1)],
                    verbose_name='Capacidad',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('exam_session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='venues',
                    to='exams.examsession',
                    verbose_name='Sesión de Examen',
                )),
                ('program', models.ForeignKey(
                    db_constraint=False,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='exam_venues',
                    to='academic.academicprogram',
                    verbose_name='Programa',
                )),
            ],
            options={
                'verbose_name': 'Sede de Examen',
                'verbose_name_plural': 'Sedes de Examen',
                'db_table': 'exam_venues',
                'ordering': ['program', 'building', 'room'],
            },
        ),
        migrations.AddIndex(
            model_name='examsession',
            index=models.Index(fields=['period'], name='exam_session_period_idx'),
        ),
        migrations.AddIndex(
            model_name='examsession',
            index=models.Index(fields=['status'], name='exam_session_status_idx'),
        ),
        migrations.AddIndex(
            model_name='examsession',
            index=models.Index(fields=['exam_date'], name='exam_session_date_idx'),
        ),
        migrations.AddIndex(
            model_name='examvenue',
            index=models.Index(fields=['exam_session'], name='exam_venue_session_idx'),
        ),
        migrations.AddIndex(
            model_name='examvenue',
            index=models.Index(fields=['program'], name='exam_venue_program_idx'),
        ),
    ]
