import { Navigate } from 'react-router-dom';
import { RegisterForm } from '@/components/organisms/RegisterForm/RegisterForm';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';

export const Register = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-10">
      <div className="max-w-xl w-full space-y-6 p-8 bg-white rounded-xl shadow-2xl mx-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sistema Universitario</h1>
          <p className="mt-1 text-sm text-gray-600">Crea tu cuenta de aspirante</p>
        </div>
        <RegisterForm />
        <div className="text-center text-sm text-gray-500">
          <p>Universidad Tecnológica © 2026</p>
        </div>
      </div>
    </div>
  );
};
