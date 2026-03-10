import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { authService } from '@/services/auth/authService';
import { ROUTES } from '@/config/constants';
import type { RegisterData } from '@/types';

const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterData>();

  const password = watch('password');

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

  if (successMessage) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg">
          <p className="font-semibold text-lg mb-1">¡Registro exitoso!</p>
          <p className="text-sm">{successMessage}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Datos personales */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Datos personales
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre(s)"
            error={errors.first_name?.message}
            {...register('first_name', { required: 'El nombre es requerido' })}
          />
          <Input
            label="Apellido Paterno"
            error={errors.last_name?.message}
            {...register('last_name', { required: 'El apellido es requerido' })}
          />
        </div>
        <div className="mt-3">
          <Input
            label="Apellido Materno (opcional)"
            error={errors.second_last_name?.message}
            {...register('second_last_name')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Input
            label="CURP"
            placeholder="AAAA000000XAAAAX0"
            className="uppercase"
            error={errors.curp?.message}
            {...register('curp', {
              required: 'La CURP es requerida',
              pattern: {
                value: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i,
                message: 'CURP inválida (18 caracteres)',
              },
              minLength: { value: 18, message: 'La CURP tiene 18 caracteres' },
              maxLength: { value: 18, message: 'La CURP tiene 18 caracteres' },
            })}
          />
          <Input
            label="Fecha de Nacimiento"
            type="date"
            error={errors.date_of_birth?.message}
            {...register('date_of_birth', { required: 'La fecha de nacimiento es requerida' })}
          />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register('gender', { required: 'El género es requerido' })}
          >
            <option value="">Selecciona...</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.gender && (
            <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
          )}
        </div>
      </div>

      {/* Contacto */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Contacto
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Teléfono"
            type="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Ciudad"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Estado"
            error={errors.state?.message}
            {...register('state')}
          />
        </div>
      </div>

      {/* Cuenta */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Cuenta
        </p>
        <div className="space-y-3">
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
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
            <Input
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'La contraseña es requerida',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.password_confirm?.message}
              {...register('password_confirm', {
                required: 'Confirma tu contraseña',
                validate: (value) =>
                  value === password || 'Las contraseñas no coinciden',
              })}
            />
          </div>
        </div>
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary-600 hover:underline font-medium">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
};
