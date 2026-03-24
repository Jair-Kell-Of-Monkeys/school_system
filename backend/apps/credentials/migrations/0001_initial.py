# Generated migration for the credentials module.
#
# The 'credentials' table is NOT managed by Django (managed=False) and
# already exists in the database. We use SeparateDatabaseAndState to
# register the unmanaged Credential model in the migration state so that
# FK relations can be resolved.
#
# New tables created here:
#   - credential_convocatorias
#   - credential_requests

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('academic', '0001_initial'),
        ('enrollments', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Register the unmanaged Credential in the migration state only.
        # No DB operation is performed — the 'credentials' table already exists.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Credential',
                    fields=[
                        ('id', models.UUIDField(
                            primary_key=True,
                            default=uuid.uuid4,
                            editable=False,
                            serialize=False,
                        )),
                    ],
                    options={
                        'managed': False,
                        'db_table': 'credentials',
                    },
                ),
            ],
            database_operations=[],
        ),

        # Create credential_convocatorias (new table)
        migrations.CreateModel(
            name='CredentialConvocatoria',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    primary_key=True,
                    serialize=False,
                )),
                ('title', models.CharField(max_length=255, verbose_name='Título')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Descripción')),
                ('requirements', models.TextField(
                    blank=True, null=True, verbose_name='Requisitos de fotografía',
                )),
                ('fecha_inicio', models.DateField(verbose_name='Inicio de solicitudes')),
                ('fecha_fin', models.DateField(verbose_name='Cierre de solicitudes')),
                ('status', models.CharField(
                    choices=[
                        ('borrador', 'Borrador'),
                        ('activa', 'Activa'),
                        ('cerrada', 'Cerrada'),
                    ],
                    default='borrador',
                    max_length=20,
                    verbose_name='Estado',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('period', models.ForeignKey(
                    db_constraint=False,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='credential_convocatorias',
                    to='academic.academicperiod',
                    verbose_name='Periodo Académico',
                )),
                ('created_by', models.ForeignKey(
                    db_constraint=False,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_convocatorias',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
            ],
            options={
                'verbose_name': 'Convocatoria de Credencial',
                'verbose_name_plural': 'Convocatorias de Credencial',
                'db_table': 'credential_convocatorias',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='credentialconvocatoria',
            index=models.Index(fields=['status'], name='cred_conv_status_idx'),
        ),
        migrations.AddIndex(
            model_name='credentialconvocatoria',
            index=models.Index(fields=['period'], name='cred_conv_period_idx'),
        ),

        # Create credential_requests (new table)
        migrations.CreateModel(
            name='CredentialRequest',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    primary_key=True,
                    serialize=False,
                )),
                ('status', models.CharField(
                    choices=[
                        ('pendiente', 'Pendiente'),
                        ('aprobada', 'Aprobada'),
                        ('rechazada', 'Rechazada'),
                        ('generada', 'Generada'),
                    ],
                    default='pendiente',
                    max_length=20,
                    verbose_name='Estado',
                )),
                ('rejection_reason', models.TextField(
                    blank=True, null=True, verbose_name='Motivo de rechazo',
                )),
                ('requested_at', models.DateTimeField(
                    auto_now_add=True, verbose_name='Fecha de solicitud',
                )),
                ('reviewed_at', models.DateTimeField(
                    blank=True, null=True, verbose_name='Fecha de revisión',
                )),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('convocatoria', models.ForeignKey(
                    db_constraint=False,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='requests',
                    to='credentials.credentialconvocatoria',
                    verbose_name='Convocatoria',
                )),
                ('enrollment', models.ForeignKey(
                    db_constraint=False,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='credential_requests',
                    to='enrollments.enrollment',
                    verbose_name='Inscripción',
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True,
                    db_constraint=False,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reviewed_credential_requests',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Revisado por',
                )),
            ],
            options={
                'verbose_name': 'Solicitud de Credencial',
                'verbose_name_plural': 'Solicitudes de Credencial',
                'db_table': 'credential_requests',
                'ordering': ['-requested_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='credentialrequest',
            constraint=models.UniqueConstraint(
                fields=['convocatoria', 'enrollment'],
                name='unique_request_per_convocatoria_enrollment',
            ),
        ),
        migrations.AddIndex(
            model_name='credentialrequest',
            index=models.Index(fields=['status'], name='cred_req_status_idx'),
        ),
        migrations.AddIndex(
            model_name='credentialrequest',
            index=models.Index(fields=['convocatoria'], name='cred_req_conv_idx'),
        ),
        migrations.AddIndex(
            model_name='credentialrequest',
            index=models.Index(fields=['enrollment'], name='cred_req_enrollment_idx'),
        ),
    ]
