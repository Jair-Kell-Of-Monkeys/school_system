import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth/authService';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

// ── Reutiliza el mismo componente de campo que LoginForm ──────────────────

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

// ── Tipos ─────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'loading' | 'success' | 'error';

// ── ResetPassword ─────────────────────────────────────────────────────────

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pageState, setPageState] = useState<PageState>('idle');
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});

  // Redirigir tras éxito
  useEffect(() => {
    if (pageState !== 'success') return;
    const t = setTimeout(() => navigate('/login'), 2000);
    return () => clearTimeout(t);
  }, [pageState, navigate]);

  // Token ausente
  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="w-full max-w-sm text-center space-y-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'var(--color-danger-bg)' }}
          >
            <AlertCircle size={28} style={{ color: 'var(--color-danger)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Enlace inválido
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Este enlace de restablecimiento no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-semibold transition-colors"
            style={{ color: 'var(--color-info)' }}
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  const validate = () => {
    const errs: { new?: string; confirm?: string } = {};
    if (!newPassword) errs.new = 'La contraseña es requerida';
    else if (newPassword.length < 8) errs.new = 'Mínimo 8 caracteres';
    if (!confirmPassword) errs.confirm = 'Confirma tu contraseña';
    else if (newPassword !== confirmPassword) errs.confirm = 'Las contraseñas no coinciden';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setServerError('');
    setPageState('loading');
    try {
      await authService.resetPassword(token, newPassword, confirmPassword);
      setPageState('success');
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Ocurrió un error. Intenta de nuevo.';
      setServerError(msg);
      setPageState('error');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
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
            Nueva contraseña
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Elige una contraseña segura de al menos 8 caracteres.
          </p>
        </div>

        {/* Success */}
        {pageState === 'success' ? (
          <div className="space-y-4">
            <div
              className="flex items-start gap-3 px-4 py-4 rounded-xl text-sm"
              style={{
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                color: 'var(--color-success)',
              }}
            >
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              Tu contraseña fue actualizada. Redirigiendo al inicio de sesión…
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            <AuthField
              label="Nueva contraseña"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              icon={<Lock size={15} />}
              error={fieldErrors.new}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="p-0.5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <AuthField
              label="Confirmar contraseña"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              icon={<Lock size={15} />}
              error={fieldErrors.confirm}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="p-0.5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {/* Server error */}
            {pageState === 'error' && serverError && (
              <div
                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm"
                style={{
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger)',
                }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={pageState === 'loading'}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2 mt-2"
              style={{
                background: pageState === 'loading'
                  ? 'rgba(99,102,241,0.6)'
                  : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                boxShadow: pageState === 'loading' ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              {pageState === 'loading' && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {pageState === 'loading' ? 'Guardando…' : 'Restablecer contraseña'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
};
