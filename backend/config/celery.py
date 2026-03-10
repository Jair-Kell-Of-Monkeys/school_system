# config/celery.py
"""
Configuración de Celery para tareas asíncronas
"""

import os
from celery import Celery

# Establecer configuración de Django por defecto
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('school_system')

# Cargar configuración desde Django settings con namespace CELERY
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodescubrir tareas en todos los módulos tasks.py de las apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    """Tarea de prueba"""
    print(f'Request: {self.request!r}')