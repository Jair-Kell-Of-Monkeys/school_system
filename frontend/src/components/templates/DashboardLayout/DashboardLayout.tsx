import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES, ROLES } from '@/config/constants';
import { useTheme } from '@/hooks/useTheme';
import {
  Home, FileText, DollarSign, LogOut, Menu,
  UserCog, GraduationCap, BookOpen, ClipboardList,
  Award, IdCard, Sun, Moon, CalendarDays, Megaphone,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

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
        { icon: CalendarDays, label: 'Periodos Académicos',       path: ROUTES.PERIODS },
        { icon: Megaphone,    label: 'Convocatorias de Admisión', path: ROUTES.ANNOUNCEMENTS },
        { icon: UserCog,      label: 'Encargados',                path: ROUTES.STAFF },
        { icon: GraduationCap,label: 'Estudiantes',               path: ROUTES.STUDENTS },
        { icon: FileText,     label: 'Pre-inscripciones',         path: ROUTES.PRE_ENROLLMENTS },
        { icon: ClipboardList,label: 'Exámenes',                  path: ROUTES.EXAM_SESSIONS },
        { icon: BookOpen,     label: 'Inscripciones',             path: ROUTES.ENROLLMENTS },
        { icon: Award,        label: 'Convocatorias de Credencial',path: '/credentials' },
        { icon: IdCard,       label: 'Solicitudes de Credencial', path: '/credential-requests' },
      ];
    }

    if (user?.role === ROLES.SERVICIOS_ESCOLARES) {
      return [
        ...baseItems,
        { icon: GraduationCap,label: 'Mis Estudiantes',           path: ROUTES.STUDENTS },
        { icon: FileText,     label: 'Pre-inscripciones',         path: ROUTES.PRE_ENROLLMENTS },
        { icon: ClipboardList,label: 'Exámenes',                  path: ROUTES.EXAM_SESSIONS },
        { icon: BookOpen,     label: 'Inscripciones',             path: ROUTES.ENROLLMENTS },
        { icon: IdCard,       label: 'Solicitudes de Credencial', path: '/credential-requests' },
      ];
    }

    if (user?.role === ROLES.FINANZAS) {
      return [
        ...baseItems,
        { icon: DollarSign,   label: 'Validar Pagos',             path: '/payments' },
      ];
    }

    if (user?.role === ROLES.ASPIRANTE || user?.role === ROLES.ALUMNO) {
      return [
        ...baseItems,
        { icon: FileText,     label: 'Mi Solicitud',              path: '/my-application' },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm bg-accent-500"
          >
            U
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Sistema</p>
            <p className="text-xs leading-tight" style={{ color: 'var(--sidebar-text)' }}>Universitario</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={17} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info + actions */}
      <div className="px-3 pb-4 space-y-2 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="nav-item"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark'
            ? <Sun size={17} className="shrink-0" />
            : <Moon size={17} className="shrink-0" />
          }
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>

        {/* User card */}
        <div
          className="rounded-lg px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <p className="text-white text-xs font-medium truncate">{user?.email}</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ color: '#f87171' }}
        >
          <LogOut size={17} className="shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 flex-shrink-0 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'var(--sidebar-bg)',
          boxShadow: '4px 0 32px rgba(10,22,60,.18)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header
          className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
          }}
        >
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Menu size={22} />
          </button>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Sistema Universitario
          </span>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
