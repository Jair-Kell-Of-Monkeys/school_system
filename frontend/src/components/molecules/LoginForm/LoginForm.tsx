import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/authStore';
import type { LoginCredentials } from '@/types';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, ROUTES } from '@/config/constants';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

// ── Styled input wrapper with leading icon ─────────────────────────────────

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const AuthField = ({ label, error, icon, rightSlot, id, ...props }: FieldProps) => {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
          style={{ color: error ? '#f87171' : 'var(--text-muted)' }}
        >
          {icon}
        </span>
        <input
          id={fieldId}
          className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{
            background: 'var(--bg-surface-2)',
            border: `1.5px solid ${error ? '#f87171' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
          {...props}
        />
        {rightSlot && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: '#f87171' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

// ── LoginForm ─────────────────────────────────────────────────────────────

export const LoginForm = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const onSubmit = async (data: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError('');
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, data);
      const { user, tokens } = response.data;
      setAuth(user, tokens);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">

      {/* Header */}
      <div className="mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 font-bold text-white text-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
        >
          U
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Bienvenido de nuevo
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <AuthField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          icon={<Mail size={15} />}
          error={errors.email?.message}
          {...register('email', {
            required: 'El correo es requerido',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Correo inválido',
            },
          })}
        />

        <AuthField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock size={15} />}
          error={errors.password?.message}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="p-0.5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          {...register('password', {
            required: 'La contraseña es requerida',
            minLength: { value: 6, message: 'Mínimo 6 caracteres' },
          })}
        />

        {/* Server error */}
        {error && (
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm"
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
            }}
          >
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2 mt-2"
          style={{
            background: isLoading
              ? 'rgba(99,102,241,0.6)'
              : 'linear-gradient(135deg, #4f46e5, #6366f1)',
            boxShadow: isLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>

        {/* Register link */}
        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <Link
            to={ROUTES.REGISTER}
            className="font-semibold transition-colors"
            style={{ color: 'var(--color-info)' }}
          >
            Regístrate aquí
          </Link>
        </p>
      </form>
    </div>
  );
};
