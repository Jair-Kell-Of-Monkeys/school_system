import { Navigate } from 'react-router-dom';
import { RegisterForm } from '@/components/organisms/RegisterForm/RegisterForm';
import { AuthLayout } from '@/components/templates/AuthLayout/AuthLayout';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';

export const Register = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
};
