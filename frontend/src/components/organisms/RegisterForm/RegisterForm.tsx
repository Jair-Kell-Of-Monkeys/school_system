import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/auth/authService';
import { ROUTES } from '@/config/constants';
import type { RegisterData } from '@/types';
import {
  User, Mail, Lock, Eye, EyeOff, AlertCircle,
  CheckCircle, Phone, MapPin, Calendar, CreditCard,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: 'masculino',         label: 'Masculino' },
  { value: 'femenino',          label: 'Femenino' },
  { value: 'otro',              label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (pw.length >= 12)          score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;

  if (score <= 1) return { score, label: 'Muy débil',  color: '#ef4444' };
  if (score === 2) return { score, label: 'Débil',      color: '#f97316' };
  if (score === 3) return { score, label: 'Regular',    color: '#eab308' };
  if (score === 4) return { score, label: 'Fuerte',     color: '#22c55e' };
  return               { score, label: 'Muy fuerte',  color: '#10b981' };
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const AuthField = ({ label, error, icon, rightSlot, id, ...props }: AuthFieldProps) => {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const isReadOnly = !!props.readOnly;
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
        {icon && (
          <span
            className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
            style={{ color: error ? '#f87171' : 'var(--text-muted)' }}
          >
            {icon}
          </span>
        )}
        <input
          id={fieldId}
          className="block w-full py-2.5 rounded-xl text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{
            paddingLeft: icon ? '2.5rem' : '0.75rem',
            paddingRight: rightSlot ? '2.5rem' : '0.75rem',
            background: isReadOnly ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)',
            border: `1.5px solid ${
              error
                ? '#f87171'
                : isReadOnly
                ? 'var(--color-success-border)'
                : 'var(--border)'
            }`,
            color: 'var(--text-primary)',
            cursor: isReadOnly ? 'default' : undefined,
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

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: React.ReactNode;
}

const SelectField = ({ label, error, id, children, ...props }: SelectFieldProps) => {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  const isDisabled = !!props.disabled;
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <select
        id={fieldId}
        className="block w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 appearance-none"
        style={{
          background: isDisabled ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)',
          border: `1.5px solid ${
            error
              ? '#f87171'
              : isDisabled
              ? 'var(--color-success-border)'
              : 'var(--border)'
          }`,
          color: 'var(--text-primary)',
          cursor: isDisabled ? 'default' : undefined,
          opacity: 1,  // Neutralizar opacidad del navegador en estado disabled
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: '#f87171' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

const SectionTitle = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <p
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
    </p>
    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
  </div>
);

// ── RegisterForm ───────────────────────────────────────────────────────────

type CurpLookupState = 'idle' | 'loading' | 'success' | 'error';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [curpLookupState, setCurpLookupState] = useState<CurpLookupState>('idle');
  const [curpAutoFilled, setCurpAutoFilled] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterData>();

  const password = watch('password') || '';
  const strength = passwordStrength(password);

  // ── CURP autofill helpers ───────────────────────────────────────────────

  // Llamada cuando el usuario edita la CURP tras un autofill:
  // los campos derivados se vuelven obsoletos y se borran.
  const clearAutoFill = () => {
    setCurpAutoFilled(false);
    setCurpLookupState('idle');
    setValue('first_name', '', { shouldValidate: false });
    setValue('last_name', '', { shouldValidate: false });
    setValue('second_last_name', '');
    setValue('date_of_birth', '', { shouldValidate: false });
    setValue('gender', '', { shouldValidate: false });
  };

  // Llamada desde el botón "Editar manualmente":
  // solo desbloquea los campos, no toca sus valores.
  const enableManualEdit = () => {
    setCurpAutoFilled(false);
    setCurpLookupState('idle');
  };

  const handleCurpBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    // Leer el valor antes de cualquier await (el evento sintético puede limpiarse)
    const curpValue = e.target.value.toUpperCase();

    // No relanzar si ya está en proceso o ya se autollenó con esta CURP
    if (curpAutoFilled || curpLookupState === 'loading') return;

    // Solo consultar si el formato es válido
    if (!CURP_REGEX.test(curpValue)) return;

    setCurpLookupState('loading');
    try {
      const data = await authService.lookupCurp(curpValue);
      setValue('first_name', data.first_name, { shouldValidate: true, shouldDirty: true });
      setValue('last_name', data.last_name, { shouldValidate: true, shouldDirty: true });
      setValue('second_last_name', data.second_last_name ?? '');
      setValue('date_of_birth', data.date_of_birth, { shouldValidate: true, shouldDirty: true });
      setValue('gender', data.gender, { shouldValidate: true, shouldDirty: true });
      setCurpAutoFilled(true);
      setCurpLookupState('success');
    } catch {
      setCurpLookupState('error');
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const onSubmit = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setServerError('');
      const result = await authService.register({ ...data, curp: data.curp.toUpperCase() });
      setSuccessMessage(result.message);
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstField = Object.keys(detail)[0];
        const firstMsg = Array.isArray(detail[firstField])
          ? detail[firstField][0]
          : detail[firstField];
        setServerError(firstMsg || 'Error al registrarse');
      } else {
        setServerError('Error al registrarse. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────

  if (successMessage) {
    return (
      <div className="w-full max-w-md text-center space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'var(--color-success-bg)' }}
        >
          <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Registro exitoso!
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {successMessage}
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.LOGIN)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  // ── CURP field registration (extraído para poder mezclar handlers) ──────

  const curpFieldProps = register('curp', {
    required: 'La CURP es requerida',
    pattern: {
      value: CURP_REGEX,
      message: 'CURP inválida (18 caracteres)',
    },
    minLength: { value: 18, message: 'La CURP tiene 18 caracteres' },
    maxLength: { value: 18, message: 'La CURP tiene 18 caracteres' },
  });

  // ── Main form ──────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 font-bold text-white text-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
        >
          U
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Crea tu cuenta
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Completa los datos para solicitar tu admisión
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Datos personales ── */}
        <section>
          <SectionTitle label="Datos personales" />
          <div className="space-y-3">

            {/* CURP — primer campo: al llenarse dispara el autofill */}
            <div>
              <AuthField
                label="CURP"
                placeholder="AAAA000000XAAAAX0"
                className="uppercase"
                maxLength={18}
                icon={<CreditCard size={14} />}
                error={errors.curp?.message}
                rightSlot={
                  curpLookupState === 'loading' ? (
                    <span className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block" />
                  ) : curpLookupState === 'success' ? (
                    <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                  ) : curpLookupState === 'error' ? (
                    <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
                  ) : null
                }
                {...curpFieldProps}
                onChange={(e) => {
                  curpFieldProps.onChange(e);
                  // Si el usuario edita la CURP tras un autofill, limpiar los campos
                  if (curpAutoFilled) clearAutoFill();
                }}
                onBlur={async (e) => {
                  curpFieldProps.onBlur(e);   // Validación de react-hook-form
                  await handleCurpBlur(e);    // Consulta a la API
                }}
              />

              {/* Indicador de resultado bajo el campo CURP */}
              {curpLookupState === 'success' && (
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                    <CheckCircle size={11} />
                    Datos obtenidos automáticamente
                  </p>
                  <button
                    type="button"
                    className="text-xs underline"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={enableManualEdit}
                  >
                    Editar manualmente
                  </button>
                </div>
              )}
              {curpLookupState === 'error' && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  No se encontraron datos. Completa los campos manualmente.
                </p>
              )}
            </div>

            {/* Nombre y apellido paterno */}
            <div className="grid grid-cols-2 gap-3">
              <AuthField
                label="Nombre(s)"
                icon={<User size={14} />}
                error={errors.first_name?.message}
                readOnly={curpAutoFilled}
                {...register('first_name', { required: 'El nombre es requerido' })}
              />
              <AuthField
                label="Apellido Paterno"
                icon={<User size={14} />}
                error={errors.last_name?.message}
                readOnly={curpAutoFilled}
                {...register('last_name', { required: 'El apellido es requerido' })}
              />
            </div>

            <AuthField
              label="Apellido Materno"
              icon={<User size={14} />}
              error={errors.second_last_name?.message}
              readOnly={curpAutoFilled}
              {...register('second_last_name')}
            />

            {/* Fecha de nacimiento y género */}
            <div className="grid grid-cols-2 gap-3">
              <AuthField
                label="Fecha de Nacimiento"
                type="date"
                icon={<Calendar size={14} />}
                error={errors.date_of_birth?.message}
                readOnly={curpAutoFilled}
                {...register('date_of_birth', { required: 'La fecha de nacimiento es requerida' })}
              />
              <SelectField
                label="Género"
                error={errors.gender?.message}
                disabled={curpAutoFilled}
                {...register('gender', { required: 'El género es requerido' })}
              >
                <option value="">Selecciona…</option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectField>
            </div>

          </div>
        </section>

        {/* ── Contacto ── */}
        <section>
          <SectionTitle label="Contacto" />
          <div className="grid grid-cols-3 gap-3">
            <AuthField
              label="Teléfono"
              type="tel"
              icon={<Phone size={14} />}
              error={errors.phone?.message}
              {...register('phone')}
            />
            <AuthField
              label="Ciudad"
              icon={<MapPin size={14} />}
              error={errors.city?.message}
              {...register('city')}
            />
            <AuthField
              label="Estado"
              icon={<MapPin size={14} />}
              error={errors.state?.message}
              {...register('state')}
            />
          </div>
        </section>

        {/* ── Acceso ── */}
        <section>
          <SectionTitle label="Acceso" />
          <div className="space-y-3">
            <AuthField
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              icon={<Mail size={14} />}
              error={errors.email?.message}
              {...register('email', {
                required: 'El correo es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Correo inválido',
                },
                validate: async (value) => {
                  try {
                    const result = await authService.checkEmail(value);
                    return result.available || 'Este correo ya está registrado';
                  } catch {
                    return true;
                  }
                },
              })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <AuthField
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  icon={<Lock size={14} />}
                  error={errors.password?.message}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  })}
                />
                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background: i <= strength.score ? strength.color : 'var(--border)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <AuthField
                label="Confirmar contraseña"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                icon={<Lock size={14} />}
                error={errors.password_confirm?.message}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
                {...register('password_confirm', {
                  required: 'Confirma tu contraseña',
                  validate: (value) =>
                    value === password || 'Las contraseñas no coinciden',
                })}
              />
            </div>
          </div>
        </section>

        {/* Server error */}
        {serverError && (
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

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || curpLookupState === 'loading'}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2"
          style={{
            background:
              isLoading || curpLookupState === 'loading'
                ? 'rgba(99,102,241,0.6)'
                : 'linear-gradient(135deg, #4f46e5, #6366f1)',
            boxShadow:
              isLoading || curpLookupState === 'loading'
                ? 'none'
                : '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        {/* Login link */}
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-semibold transition-colors"
            style={{ color: 'var(--color-info)' }}
          >
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
};
