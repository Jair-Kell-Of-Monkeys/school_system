# Sistema Universitario

Sistema integral para gestión universitaria que incluye:
- Pre-inscripciones y admisión
- Inscripciones y gestión de alumnos
- Pagos y finanzas
- Credenciales estudiantiles

## Estructura del Proyecto
```
school_system_project/
├── backend/          # API REST con Django
└── frontend/         # Aplicación web (React/Vue/Next.js)
```

## Backend (Django REST Framework)

### Requisitos
- Python 3.12+
- PostgreSQL 16+

### Instalación
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Configuración

1. Copiar `.env.example` a `.env`
2. Configurar las variables de entorno
3. Ejecutar migraciones:
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Módulos Implementados

- ✅ **users**: Autenticación y roles
- ✅ **students**: Gestión de estudiantes
- ✅ **academic**: Periodos y programas académicos
- ✅ **pre_enrollment**: Pre-inscripciones y documentos
- 🚧 **enrollments**: Inscripciones formales
- 🚧 **payments**: Gestión de pagos
- 🚧 **credentials**: Credenciales estudiantiles

## Frontend

(Por implementar)

## Tecnologías

### Backend
- Django 5.0
- Django REST Framework
- PostgreSQL
- JWT Authentication

### Frontend
- (Por definir: React, Vue, o Next.js)

## Licencia

Privado - Todos los derechos reservados
