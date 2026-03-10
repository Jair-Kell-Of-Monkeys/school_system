import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '@/services/auth/authService';
import { ROUTES } from '@/config/constants';
import { CheckCircle, XCircle, Loader, MailCheck } from 'lucide-react';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';

type VerifyState = 'loading' | 'success' | 'error' | 'expired' | 'no-token';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'no-token');
  const [errorMessage, setErrorMessage] = useState('');

  // Resend form
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    authService
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        const msg: string = err.response?.data?.error || '';
        if (msg.includes('expirado') || msg.includes('expired')) {
          setState('expired');
        } else {
          setState('error');
          setErrorMessage(msg || 'El enlace de verificación no es válido.');
        }
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) return;
    try {
      setResendLoading(true);
      setResendMessage('');
      const result = await authService.resendVerification(resendEmail);
      setResendMessage(result.message);
    } catch {
      setResendMessage('No se pudo reenviar el correo. Verifica que el email sea correcto.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-2xl mx-4">
        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center space-y-4">
            <Loader className="mx-auto text-primary-600 animate-spin" size={56} />
            <h1 className="text-xl font-semibold text-gray-900">Verificando tu cuenta…</h1>
            <p className="text-sm text-gray-500">Por favor espera un momento.</p>
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto text-green-500" size={56} />
            <h1 className="text-2xl font-bold text-gray-900">¡Cuenta verificada!</h1>
            <p className="text-gray-600">
              Tu correo ha sido confirmado exitosamente. Ya puedes iniciar sesión y
              comenzar tu proceso de admisión.
            </p>
            <Link to={ROUTES.LOGIN}>
              <Button className="w-full mt-2">Iniciar sesión</Button>
            </Link>
          </div>
        )}

        {/* Token expired */}
        {state === 'expired' && (
          <div className="space-y-5">
            <div className="text-center">
              <MailCheck className="mx-auto text-yellow-500 mb-3" size={56} />
              <h1 className="text-xl font-bold text-gray-900">Enlace expirado</h1>
              <p className="text-sm text-gray-600 mt-2">
                El enlace de verificación ya expiró (válido 24 horas). Ingresa tu
                correo para recibir uno nuevo.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                label="Correo electrónico"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
              <Button
                className="w-full"
                onClick={handleResend}
                isLoading={resendLoading}
                disabled={!resendEmail}
              >
                Reenviar correo de verificación
              </Button>
              {resendMessage && (
                <p className="text-sm text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  {resendMessage}
                </p>
              )}
            </div>
            <p className="text-center text-sm text-gray-500">
              <Link to={ROUTES.LOGIN} className="text-primary-600 hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </div>
        )}

        {/* Generic error */}
        {state === 'error' && (
          <div className="text-center space-y-4">
            <XCircle className="mx-auto text-red-500" size={56} />
            <h1 className="text-xl font-bold text-gray-900">Enlace inválido</h1>
            <p className="text-sm text-gray-600">{errorMessage}</p>
            <Link to={ROUTES.LOGIN}>
              <Button variant="outline" className="w-full">
                Volver al inicio de sesión
              </Button>
            </Link>
          </div>
        )}

        {/* No token in URL */}
        {state === 'no-token' && (
          <div className="text-center space-y-4">
            <XCircle className="mx-auto text-gray-400" size={56} />
            <h1 className="text-xl font-bold text-gray-900">Enlace incompleto</h1>
            <p className="text-sm text-gray-600">
              No se encontró un token de verificación en la URL.
            </p>
            <Link to={ROUTES.LOGIN}>
              <Button variant="outline" className="w-full">
                Ir al inicio de sesión
              </Button>
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Universidad Tecnológica © 2026
        </p>
      </div>
    </div>
  );
};
