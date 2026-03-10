# config/settings/__init__.py
"""
Por defecto usa configuración de desarrollo.
Para producción: export DJANGO_SETTINGS_MODULE=config.settings.production
"""

from .development import *