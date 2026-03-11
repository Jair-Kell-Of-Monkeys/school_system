import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from '@/pages/Login/Login';
import { Register } from '@/pages/Register/Register';
import { VerifyEmail } from '@/pages/VerifyEmail/VerifyEmail';
import { Dashboard } from '@/pages/Dashboard/Dashboard';
import { Staff } from '@/pages/Staff/Staff';
import { Students } from '@/pages/Students/Students';
import { PreEnrollments } from '@/pages/PreEnrollments/PreEnrollments';
import { Payments } from '@/pages/Payments/Payments';
import { Enrollments } from '@/pages/Enrollments/Enrollments';
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

          {/* Ruta por defecto */}
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600">Página no encontrada</p>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;