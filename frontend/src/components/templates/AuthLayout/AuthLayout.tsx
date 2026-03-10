import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sistema Universitario</h1>
          <p className="mt-2 text-sm text-gray-600">Inicia sesión para continuar</p>
        </div>
        {children}
        <div className="text-center text-sm text-gray-500">
          <p>Universidad Tecnológica © 2026</p>
        </div>
      </div>
    </div>
  );
};