# config/settings/production.py
"""
Configuración para producción (Railway).
Requiere las variables de entorno definidas en .env.production.example
"""

import os

# Valores dummy para que base.py no falle al leer las variables de BD individuales.
# En producción la BD real se configura abajo con DATABASE_URL via dj-database-url.
os.environ.setdefault('DB_NAME', 'railway')
os.environ.setdefault('DB_USER', 'postgres')
os.environ.setdefault('DB_PASSWORD', 'dummy')
os.environ.setdefault('DB_HOST', 'localhost')
os.environ.setdefault('DB_PORT', '5432')

import dj_database_url
from .base import *

# ─── Seguridad ────────────────────────────────────────────────────────────────

DEBUG = False

SECRET_KEY = os.environ['SECRET_KEY']

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# ─── Base de datos ────────────────────────────────────────────────────────────

DATABASES = {
    'default': dj_database_url.config(
        env='DATABASE_URL',
        conn_max_age=600,
        ssl_require=True,
    )
}

# ─── Archivos estáticos con WhiteNoise ────────────────────────────────────────

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # justo después de SecurityMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─── Archivos de medios ───────────────────────────────────────────────────────
# En producción usa un bucket externo (S3/Cloudinary). Por ahora sigue con disco.
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ─── CORS ────────────────────────────────────────────────────────────────────

import re as _re

# Permite todos los subdominios de Vercel y el dominio principal del frontend.
_frontend_url = os.environ.get('FRONTEND_URL', '').strip()

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
    r"^https://school-system.*\.vercel\.app$",
] + (
    # Si FRONTEND_URL es un dominio propio (no Vercel), añadirlo como origen exacto vía regex.
    [r"^" + _re.escape(_frontend_url) + r"$"]
    if _frontend_url and not _frontend_url.endswith('.vercel.app')
    else []
)

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# ─── HTTPS / Headers de seguridad ────────────────────────────────────────────

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# ─── Email ────────────────────────────────────────────────────────────────────

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@universidad.edu.mx')

# ─── Celery ───────────────────────────────────────────────────────────────────

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', '')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', '')

# ─── Frontend URL ─────────────────────────────────────────────────────────────

FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

# ─── Logging en producción ───────────────────────────────────────────────────

LOGGING['handlers']['file']['filename'] = '/tmp/django.log'
LOGGING['loggers']['django']['level'] = 'WARNING'
LOGGING['loggers']['apps']['level'] = 'INFO'
