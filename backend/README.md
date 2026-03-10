# 🎓 School System - Sistema de Gestión Universitaria

Sistema integral para gestión de pre-inscripciones, inscripciones y acreditación estudiantil.

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Uso](#uso)
- [API Endpoints](#api-endpoints)
- [Desarrollo](#desarrollo)

---

## 🔧 Requisitos

- Python 3.10+
- PostgreSQL 14+
- Redis 7+
- Ubuntu 22.04+ (o compatible)

## 📦 Instalación

### 1. Clonar/Crear el proyecto

```bash
# Si ya tienes el proyecto
cd school_system

# Si estás creando desde cero
mkdir school_system
cd school_system
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configurar PostgreSQL

```bash
# Conectarse a PostgreSQL
sudo -u postgres psql

# Dentro de psql:
CREATE DATABASE school_system WITH ENCODING = 'UTF8';
CREATE USER django_app WITH PASSWORD 'tu_password';
GRANT CONNECT ON DATABASE school_system TO django_app;
\c school_system
GRANT USAGE, CREATE ON SCHEMA public TO django_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO django_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO django_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO django_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO django_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO django_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO django_app;
\q

# Ejecutar el script SQL completo
sudo -u postgres psql -d school_system -f /ruta/complete_school_database.sql
```

### 5. Configurar Redis

```bash
# Verificar que Redis esté instalado e iniciado
redis-cli ping
# Debe responder: PONG

# Si no está instalado:
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

## ⚙️ Configuración

### 1. Archivo .env

Crear archivo `.env` en la raíz del proyecto:

```env
# Django
SECRET_KEY=tu-clave-secreta-muy-segura-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=school_system
DB_USER=django_app
DB_PASSWORD=tu_password_aqui
DB_HOST=localhost
DB_PORT=5432

# Redis/Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (Gmail ejemplo)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password
DEFAULT_FROM_EMAIL=Sistema Universitario <noreply@universidad.edu.mx>

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=10080
```

### 2. Crear directorios

```bash
mkdir -p media/{documents,photos,payment_slips,payment_proofs,credentials}
mkdir -p logs
mkdir -p static
```

### 3. Verificar instalación

```bash
python manage.py check
```

## 🏗️ Estructura del Proyecto

```
school_system/
├── apps/
│   ├── users/              # Gestión de usuarios y autenticación
│   ├── academic/           # Periodos y programas académicos
│   ├── students/           # Datos de estudiantes
│   ├── pre_enrollment/     # Pre-inscripciones
│   ├── enrollments/        # Inscripciones
│   ├── payments/           # Gestión de pagos
│   ├── credentials/        # Credenciales estudiantiles
│   └── notifications/      # Notificaciones y emails
├── config/
│   ├── settings/
│   │   ├── base.py         # Configuración base
│   │   ├── development.py  # Desarrollo
│   │   └── production.py   # Producción
│   ├── urls.py
│   ├── wsgi.py
│   └── celery.py
├── core/
│   ├── permissions.py      # Permisos globales
│   ├── exceptions.py       # Manejo de excepciones
│   └── utils.py            # Utilidades comunes
├── media/                  # Archivos subidos
├── static/                 # Archivos estáticos
├── templates/              # Templates HTML
└── logs/                   # Logs de aplicación
```

## 🚀 Uso

### Desarrollo

```bash
# Terminal 1: Django server
python manage.py runserver

# Terminal 2: Celery worker
celery -A config worker --loglevel=info

# Terminal 3: Celery beat (tareas programadas)
celery -A config beat --loglevel=info
```

### Crear superusuario

```bash
python manage.py createsuperuser
```

### Acceder al admin

```
http://localhost:8000/admin/
```

## 📡 API Endpoints

### Autenticación

```
POST   /api/auth/login/          # Login (obtener tokens)
POST   /api/auth/refresh/        # Refresh token
POST   /api/auth/verify/         # Verificar token
```

### Usuarios

```
POST   /api/users/register/      # Registro de aspirante
GET    /api/users/me/            # Perfil del usuario actual
PUT    /api/users/me/            # Actualizar perfil
```

### Pre-inscripciones

```
GET    /api/pre-enrollments/                    # Listar
POST   /api/pre-enrollments/                    # Crear
GET    /api/pre-enrollments/{id}/               # Detalle
PUT    /api/pre-enrollments/{id}/               # Actualizar
POST   /api/pre-enrollments/{id}/submit/       # Enviar solicitud
POST   /api/pre-enrollments/{id}/approve_documents/  # Aprobar docs
POST   /api/pre-enrollments/{id}/schedule_exam/      # Programar examen
```

### Documentos

```
POST   /api/pre-enrollments/{id}/documents/    # Subir documento
GET    /api/documents/{id}/                    # Ver documento
DELETE /api/documents/{id}/                    # Eliminar documento
POST   /api/documents/{id}/review/            # Revisar documento
```

### Pagos

```
GET    /api/payments/                          # Listar pagos
GET    /api/payments/{id}/                     # Detalle
POST   /api/payments/{id}/submit_proof/       # Subir comprobante
POST   /api/payments/{id}/validate/           # Validar pago (Finanzas)
GET    /api/payments/{id}/slip/               # Descargar ficha
```

### Inscripciones

```
GET    /api/enrollments/                       # Listar
GET    /api/enrollments/{id}/                  # Detalle
POST   /api/enrollments/{id}/assign_group/    # Asignar grupo
```

### Credenciales

```
GET    /api/credentials/                       # Listar
GET    /api/credentials/{id}/                  # Detalle
GET    /api/credentials/{id}/download/        # Descargar PDF
POST   /api/credentials/generate/             # Generar credencial
```

## 🛠️ Desarrollo

### Ejecutar tests

```bash
python manage.py test
```

### Crear nueva migración

```bash
python manage.py makemigrations
python manage.py migrate
```

### Verificar código

```bash
# Instalar flake8
pip install flake8

# Verificar
flake8 apps/
```

### Ver logs

```bash
tail -f logs/django.log
```

## 📚 Documentación Adicional

- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery](https://docs.celeryproject.org/)
- [PostgreSQL](https://www.postgresql.org/docs/)

## 🤝 Contribuciones

1. Fork el proyecto
2. Crear rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con ❤️ para la Universidad Tecnológica**