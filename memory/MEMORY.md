# Project Memory

## Project: Sistema Universitario (University School System)

Django REST + React/TypeScript. Backend at `backend/`, frontend at `frontend/`.

## Key Architecture Notes

- Settings module: `config.settings.development` (not `dev`)
- User roles: `admin`, `servicios_escolares_jefe`, `servicios_escolares`, `finanzas`, `vinculacion`, `aspirante`, `alumno`
- Staff roles constant in `pre_enrollment/permissions.py`: `['admin', 'servicios_escolares_jefe', 'servicios_escolares']`
- Auth: JWT via djangorestframework-simplejwt
- All API endpoints under `/api/` prefix

## DB Permissions Pattern

Tables owned by postgres (not django_app):
- `payments` → `managed = False`, `db_column` mappings where field names differ
- `enrollments` → `managed = False` (same pattern)

When creating managed tables with FK to these unmanaged tables, use `db_constraint=False`
on the ForeignKey to avoid `permission denied` (django_app lacks REFERENCES privilege on postgres-owned tables).

Migration pattern for unmanaged FK target: use `SeparateDatabaseAndState` to register the
unmanaged model in migration state (no DB ops), then create the managed child table.

## Enrollments App (implemented)

- `models.py`: `Enrollment` (managed=False, maps `enrollments` table) + `EnrollmentDocument` (managed=True, new table)
- `generators.py`: `generate_matricula(program_code, period_year)` and `generate_institutional_email(student)`
- Migration `0001_initial.py`: only creates `enrollment_documents`; uses `SeparateDatabaseAndState` to register `Enrollment` stub in state
- `INSTITUTIONAL_EMAIL_DOMAIN` setting added to `base.py` (default: `universidad.edu.mx`)
- Institutional email is saved to `students.institutional_email` (field already existed)
- Matricula format: `{YEAR}{PROG[:3]}{NNN}` e.g. `2026ING047`; retries up to 200 times on collision
- URL: `/api/enrollments/enrollments/`

## Implemented Apps

- `users/` — custom User model, email auth, roles
- `academic/` — AcademicPeriod, AcademicProgram
- `students/` — Student profile (institutional_email field exists)
- `pre_enrollment/` — full workflow including payments, documents, announcements
- `enrollments/` — formal enrollment (this session)
- `payments/`, `credentials/`, `notifications/` — in development

## Pending

- `payments/` and `credentials/` URLs still commented out in `config/urls.py`
