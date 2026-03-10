# config/settings/development.py
"""
Configuración para entorno de desarrollo
"""

from .base import *

DEBUG = True

# Email backend — se lee del .env (smtp para Mailtrap, console como fallback)
from decouple import config as _config
EMAIL_BACKEND = _config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')

# CORS más permisivo en desarrollo
CORS_ALLOW_ALL_ORIGINS = True

# Logging más verboso en desarrollo
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'

# Django Debug Toolbar (opcional)
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1']