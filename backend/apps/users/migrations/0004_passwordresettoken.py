import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_emailverificationtoken'),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordResetToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(max_length=64, unique=True, verbose_name='Token')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado')),
                ('is_used', models.BooleanField(default=False, verbose_name='Usado')),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='password_reset_tokens',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usuario',
                )),
            ],
            options={
                'verbose_name': 'Token de Restablecimiento',
                'verbose_name_plural': 'Tokens de Restablecimiento',
                'db_table': 'password_reset_tokens',
            },
        ),
    ]
