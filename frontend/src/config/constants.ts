export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const API_ENDPOINTS = {
  LOGIN: '/users/login/',  // Cambiar de /auth/login/ a /users/login/
  LOGOUT: '/users/logout/',
  PROFILE: '/users/me/',
  CHANGE_PASSWORD: '/users/change-password/',
} as const;

export const ROLES = {
  ADMIN: 'admin',
  JEFE_SERVICIOS: 'servicios_escolares_jefe',
  SERVICIOS_ESCOLARES: 'servicios_escolares',
  FINANZAS: 'finanzas',
  VINCULACION: 'vinculacion',
  ASPIRANTE: 'aspirante',
  ALUMNO: 'alumno',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  STUDENTS: '/students',
  PRE_ENROLLMENTS: '/pre-enrollments',
  ACADEMIC: '/academic',
  PROGRAMS: '/academic/programs',
  PERIODS: '/academic/periods',
  STAFF: '/staff',
  ENROLLMENTS: '/enrollments',
  EXAM_SESSIONS: '/exam-sessions',
  ANNOUNCEMENTS: '/announcements',
} as const;