import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES, ROLES } from '@/config/constants';
import { Home, Users, FileText, DollarSign, LogOut, Menu, X, UserCog, GraduationCap } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate(ROUTES.LOGIN);
  };

  const getMenuItems = () => {
    const baseItems = [
      { icon: Home, label: 'Inicio', path: ROUTES.DASHBOARD },
    ];

    if (user?.role === ROLES.ADMIN || user?.role === ROLES.JEFE_SERVICIOS) {
      return [
        ...baseItems,
        { icon: UserCog, label: 'Encargados', path: ROUTES.STAFF },
        { icon: GraduationCap, label: 'Estudiantes', path: ROUTES.STUDENTS },
        { icon: FileText, label: 'Pre-inscripciones', path: ROUTES.PRE_ENROLLMENTS },
      ];
    }

    if (user?.role === ROLES.SERVICIOS_ESCOLARES) {
      return [
        ...baseItems,
        { icon: GraduationCap, label: 'Mis Estudiantes', path: ROUTES.STUDENTS },
        { icon: FileText, label: 'Pre-inscripciones', path: ROUTES.PRE_ENROLLMENTS },
      ];
    }

    if (user?.role === ROLES.FINANZAS) {
      return [
        ...baseItems,
        { icon: DollarSign, label: 'Validar Pagos', path: '/payments' },
        { icon: FileText, label: 'Pre-inscripciones', path: ROUTES.PRE_ENROLLMENTS },
      ];
    }

    if (user?.role === ROLES.ASPIRANTE) {
      return [
        ...baseItems,
        { icon: FileText, label: 'Mi Solicitud', path: '/my-application' },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden mr-4 p-2 rounded-md hover:bg-gray-100"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-bold text-primary-600">Sistema Universitario</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">{user?.role_display}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 lg:ml-0">
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};