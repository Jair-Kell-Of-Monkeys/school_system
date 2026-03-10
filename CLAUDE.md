# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

University school system with pre-enrollment, enrollment, payments, and credential management. Django REST API backend + React/TypeScript frontend.

## Development Commands

### Backend (Django)

```bash
# Activate virtual environment (always required first)
cd backend && source venv/bin/activate

# Run development server (port 8000)
python manage.py runserver

# Apply migrations
python manage.py migrate

# Create new migrations after model changes
python manage.py makemigrations

# Run tests
python manage.py test

# Run tests for a specific app
python manage.py test apps.users

# Create superuser
python manage.py createsuperuser

# Start Celery worker (required for async tasks/email)
celery -A config worker -l info

# Start Celery beat (required for scheduled tasks)
celery -A config beat -l info

# Code linting
flake8 apps/
```

### Frontend (React/Vite)

```bash
cd frontend

# Start dev server (port 3000, proxies /api/* to backend)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Backend

**Django app structure** under `backend/apps/`:
- `users/` — Custom user model (`apps.users.User`) with email-based auth and roles: `admin`, `director`, `academics`, `finance`, `student`, `aspirant`
- `academic/` — Academic periods and programs
- `students/` — Student profile data
- `pre_enrollment/` — Pre-registration workflow (fully implemented)
- `enrollments/`, `payments/`, `credentials/` — In development (URLs commented out in `config/urls.py`)
- `notifications/` — Email and in-app notifications

**Shared utilities** in `backend/core/`:
- `permissions.py` — Role-based permission classes (use these for new views)
- `exceptions.py` — Custom DRF exception handler (configured globally)
- `middleware.py`, `storage.py`, `utils.py`

**Settings** split across `backend/config/settings/`: `base.py`, `dev.py`, `prod.py`. Key defaults: JWT access=60min, JWT refresh=7days, pagination=20 items, language=es-mx, timezone=America/Mexico_City.

**API URL prefix:** `/api/` — all endpoints live under this prefix.

### Frontend

**Component organization** follows atomic design under `frontend/src/components/`:
- `atoms/` → `molecules/` → `organisms/` → `templates/`

**State management:**
- **Zustand** (`store/authStore.ts`) for auth/global client state
- **React Query (TanStack Query)** for server state and data fetching

**Service layer** (`frontend/src/services/`): Each domain has its own module (auth, aspirant, preEnrollments, payments, staff, students). The Axios client is configured in `services/api/`.

**Path alias:** `@` maps to `frontend/src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Frontend–Backend Communication

In development, Vite proxies all `/api/*` requests to `http://127.0.0.1:8000`. The frontend `.env` sets `VITE_API_URL=http://127.0.0.1:8000/api`.

## Key Configuration

### Environment Variables

Backend `.env` (at `backend/.env`):
```
DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
SECRET_KEY, DEBUG, ALLOWED_HOSTS
CELERY_BROKER_URL, CELERY_RESULT_BACKEND  # Redis
EMAIL_BACKEND, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
JWT_ACCESS_TOKEN_LIFETIME, JWT_REFRESH_TOKEN_LIFETIME
FRONTEND_URL, EMAIL_VERIFICATION_EXPIRY_HOURS
```

Frontend `.env` (at `frontend/.env`):
```
VITE_API_URL
```

### Database

PostgreSQL. Connection pooling enabled (`CONN_MAX_AGE=600`). Migrations live in each app's `migrations/` directory.

### Authentication

JWT via `djangorestframework-simplejwt`. Tokens issued at `/api/auth/login/`, refreshed at `/api/auth/refresh/`. Frontend stores tokens using Zustand auth store.
