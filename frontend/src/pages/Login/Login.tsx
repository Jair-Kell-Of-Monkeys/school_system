import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/molecules/LoginForm/LoginForm';
import { AuthLayout } from '@/components/templates/AuthLayout/AuthLayout';
import { useAuthStore } from '@/store/authStore';

export const Login = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
};