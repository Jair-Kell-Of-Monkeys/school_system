import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Landing } from '@/pages/Landing/Landing';
import { NotFound } from '@/pages/NotFound/NotFound';
import { Login } from '@/pages/Login/Login';
import { Register } from '@/pages/Register/Register';
import { VerifyEmail } from '@/pages/VerifyEmail/VerifyEmail';
import { Dashboard } from '@/pages/Dashboard/Dashboard';
import { Staff } from '@/pages/Staff/Staff';
import { Students } from '@/pages/Students/Students';
import { PreEnrollments } from '@/pages/PreEnrollments/PreEnrollments';
import { Payments } from '@/pages/Payments/Payments';
import { Enrollments } from '@/pages/Enrollments/Enrollments';
import { ExamSessions } from '@/pages/ExamSessions/ExamSessions';
import { Credentials } from '@/pages/Credentials/Credentials';
import { CredentialRequests } from '@/pages/CredentialRequests/CredentialRequests';
import { VerifyCredential } from '@/pages/VerifyCredential/VerifyCredential';
import { AcademicPeriods } from '@/pages/AcademicPeriods/AcademicPeriods';
import { Announcements } from '@/pages/Announcements/Announcements';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { MyApplication } from '@/pages/MyApplication/MyApplication';
import { ProtectedRoute } from '@/components/organisms/ProtectedRoute/ProtectedRoute';
import { ROUTES, ROLES } from '@/config/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Landing />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Dashboard */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Gestión de Encargados - Solo Jefa y Admin */}
          <Route
            path={ROUTES.STAFF}
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.JEFE_SERVICIOS]}>
                <DashboardLayout>
                  <Staff />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Estudiantes - Jefa, Admin y Encargados */}
          <Route
            path={ROUTES.STUDENTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.JEFE_SERVICIOS,
                  ROLES.SERVICIOS_ESCOLARES,
                ]}
              >
                <DashboardLayout>
                  <Students />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Pre-inscripciones - Jefa, Admin y Encargados */}
          <Route
            path={ROUTES.PRE_ENROLLMENTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.JEFE_SERVICIOS,
                  ROLES.SERVICIOS_ESCOLARES,
                ]}
              >
                <DashboardLayout>
                  <PreEnrollments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Mi Solicitud - Aspirantes y Alumnos */}
          <Route
            path="/my-application"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ASPIRANTE, ROLES.ALUMNO]}>
                <DashboardLayout>
                  <MyApplication />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Inscripciones - Jefa, Admin y Encargados */}
          <Route
            path={ROUTES.ENROLLMENTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.JEFE_SERVICIOS,
                  ROLES.SERVICIOS_ESCOLARES,
                ]}
              >
                <DashboardLayout>
                  <Enrollments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Exámenes - Jefa, Admin y Encargados */}
          <Route
            path={ROUTES.EXAM_SESSIONS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.JEFE_SERVICIOS,
                  ROLES.SERVICIOS_ESCOLARES,
                ]}
              >
                <DashboardLayout>
                  <ExamSessions />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Pagos - Solo Finanzas y Admin */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FINANZAS]}>
                <DashboardLayout>
                  <Payments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Credencialización — Jefe: crear y publicar convocatorias */}
          <Route
            path="/credentials"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.JEFE_SERVICIOS]}>
                <DashboardLayout>
                  <Credentials />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Solicitudes de Credencial — Staff: aprobar / rechazar */}
          <Route
            path="/credential-requests"
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.ADMIN, ROLES.JEFE_SERVICIOS, ROLES.SERVICIOS_ESCOLARES]}
              >
                <DashboardLayout>
                  <CredentialRequests />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Periodos Académicos - Solo Jefa y Admin */}
          <Route
            path={ROUTES.PERIODS}
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.JEFE_SERVICIOS]}>
                <DashboardLayout>
                  <AcademicPeriods />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Convocatorias de Admisión - Solo Jefa y Admin */}
          <Route
            path={ROUTES.ANNOUNCEMENTS}
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.JEFE_SERVICIOS]}>
                <DashboardLayout>
                  <Announcements />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Verificación de credencial — pública (se abre al escanear el QR) */}
          <Route path="/verify/:matricula" element={<VerifyCredential />} />

          {/* Ruta por defecto (fallback para rutas desconocidas) */}
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;