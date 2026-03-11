# Generated migration: creates enrollment_documents table.
# The 'enrollments' table is NOT managed by Django (managed=False) and
# already exists in the database.
# We use SeparateDatabaseAndState to register the unmanaged Enrollment model
# in the migration state so that the EnrollmentDocument FK can be resolved.

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Register the unmanaged Enrollment in the migration state only.
        # No DB operation is performed — the 'enrollments' table already exists.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Enrollment',
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
                        'db_table': 'enrollments',
                    },
                ),
            ],
            database_operations=[],
        ),
        # Create the enrollment_documents table (new table, fully managed).
        migrations.CreateModel(
            name='EnrollmentDocument',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    primary_key=True,
                    serialize=False,
                )),
                ('document_type', models.CharField(
                    choices=[
                        ('acta_nacimiento', 'Acta de Nacimiento'),
                        ('curp', 'CURP'),
                        ('comprobante_domicilio', 'Comprobante de Domicilio'),
                        ('certificado_estudios', 'Certificado de Estudios'),
                        ('fotografia', 'Fotografía'),
                        ('comprobante_pago', 'Comprobante de Pago'),
                    ],
                    max_length=50,
                    verbose_name='Tipo de Documento',
                )),
                ('file_path', models.FileField(
                    upload_to='enrollment/documents/%Y/%m/',
                    verbose_name='Archivo',
                )),
                ('file_name', models.CharField(max_length=255, verbose_name='Nombre del Archivo')),
                ('file_size', models.IntegerField(blank=True, null=True, verbose_name='Tamaño')),
                ('mime_type', models.CharField(
                    blank=True, max_length=100, null=True, verbose_name='Tipo MIME',
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pendiente'),
                        ('approved', 'Aprobado'),
                        ('rejected', 'Rechazado'),
                    ],
                    default='pending',
                    max_length=50,
                    verbose_name='Estado',
                )),
                ('reviewer_notes', models.TextField(
                    blank=True, null=True, verbose_name='Notas del Revisor',
                )),
                ('reviewed_at', models.DateTimeField(
                    blank=True, null=True, verbose_name='Fecha de Revisión',
                )),
                ('uploaded_at', models.DateTimeField(
                    auto_now_add=True, verbose_name='Fecha de Carga',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado')),
                ('enrollment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='documents',
                    to='enrollments.enrollment',
                    verbose_name='Inscripción',
                    db_constraint=False,
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reviewed_enrollment_documents',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Revisado por',
                )),
            ],
            options={
                'verbose_name': 'Documento de Inscripción',
                'verbose_name_plural': 'Documentos de Inscripción',
                'db_table': 'enrollment_documents',
                'ordering': ['document_type'],
            },
        ),
        migrations.AddConstraint(
            model_name='enrollmentdocument',
            constraint=models.UniqueConstraint(
                fields=['enrollment', 'document_type'],
                name='unique_document_per_enrollment_formal',
            ),
        ),
        migrations.AddIndex(
            model_name='enrollmentdocument',
            index=models.Index(fields=['enrollment'], name='enroll_doc_enrollment_idx'),
        ),
        migrations.AddIndex(
            model_name='enrollmentdocument',
            index=models.Index(fields=['document_type'], name='enroll_doc_type_idx'),
        ),
        migrations.AddIndex(
            model_name='enrollmentdocument',
            index=models.Index(fields=['status'], name='enroll_doc_status_idx'),
        ),
    ]
