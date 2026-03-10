# apps/users/apps.py
"""
Configuración de la app users.
"""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'
    verbose_name = 'Usuarios y Autenticación'
    
    def ready(self):
        """
        Importar señales cuando la app esté lista.
        """
        # Aquí puedes importar signals si los necesitas más adelante
        # import apps.users.signals
        pass