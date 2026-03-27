import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Forbidden } from '@/pages/Forbidden/Forbidden';
import { ROUTES } from '@/config/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Forbidden />;
  }

  return <>{children}</>;
};
