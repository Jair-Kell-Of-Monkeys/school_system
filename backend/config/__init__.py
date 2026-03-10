# config/__init__.py
"""
Importar Celery app para que se cargue al iniciar Django
"""

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ('celery_app',)