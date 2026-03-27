import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';
import { Home, ShieldOff } from 'lucide-react';

const ANIMATION_CSS = `
@keyframes fb-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fb-float-a {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-14px) rotate(-8deg); }
}
@keyframes fb-float-b {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}
@keyframes fb-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  20%       { transform: translateX(-3px) rotate(-2deg); }
  40%       { transform: translateX(3px) rotate(2deg); }
  60%       { transform: translateX(-2px) rotate(-1deg); }
  80%       { transform: translateX(2px) rotate(1deg); }
}
@keyframes fb-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.fb-fade-up { animation: fb-fade-up 0.6s ease both; }
.fb-float-a { animation: fb-float-a 6s ease-in-out infinite; }
.fb-float-b { animation: fb-float-b 8s ease-in-out infinite; }
.fb-shake   { animation: fb-shake 0.6s ease both; }
.fb-spin    { animation: fb-spin-slow 18s linear infinite; }
`;

// Accent: orange-red to differentiate from 404's indigo
const ACCENT   = '#f97316';
const ACCENT_2 = '#ef4444';

export const Forbidden = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleHome = () => navigate(isAuthenticated ? ROUTES.DASHBOARD : '/');

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <style>{ANIMATION_CSS}</style>

      {/* ── Decorative background ───────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Spinning rings */}
        <div
          className="fb-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full"
          style={{ border: `1px solid rgba(249,115,22,0.08)` }}
        />
        <div
          className="fb-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full"
          style={{
            border: `1px dashed rgba(239,68,68,0.1)`,
            animationDirection: 'reverse',
            animationDuration: '12s',
          }}
        />

        {/* Floating dots — warm tones */}
        <div className="fb-float-a absolute top-14 left-20 w-4 h-4 rounded-full opacity-35"
          style={{ background: ACCENT }} />
        <div className="fb-float-b absolute top-28 right-20 w-3 h-3 rounded-full opacity-25"
          style={{ background: ACCENT_2 }} />
        <div className="fb-float-a absolute bottom-20 left-32 w-5 h-5 rounded-full opacity-20"
          style={{ background: ACCENT, animationDuration: '10s' }} />
        <div className="fb-float-b absolute bottom-14 right-14 w-3 h-3 rounded-full opacity-30"
          style={{ background: ACCENT_2 }} />
        <div className="fb-float-a absolute top-1/2 left-10 w-2.5 h-2.5 rounded-full opacity-20"
          style={{ background: ACCENT, animationDuration: '13s' }} />

        {/* Floating triangles / diamonds */}
        <div
          className="fb-float-b absolute top-24 right-36 w-5 h-5 opacity-15"
          style={{
            background: ACCENT,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          }}
        />
        <div
          className="fb-float-a absolute bottom-28 right-44 w-4 h-4 opacity-20"
          style={{
            background: ACCENT_2,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          }}
        />
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center px-6 max-w-lg w-full">

        {/* 403 number */}
        <div className="relative inline-block mb-6">
          <div
            className="absolute inset-0 rounded-full opacity-15"
            style={{
              background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`,
            }}
          />
          <h1
            className="relative text-[9rem] sm:text-[12rem] font-black leading-none select-none"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_2} 0%, ${ACCENT} 50%, rgba(249,115,22,0.35) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            403
          </h1>
        </div>

        {/* Icon — shake on mount for attention */}
        <div
          className="fb-shake fb-fade-up w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: `rgba(249,115,22,0.1)`,
            border: `1px solid rgba(249,115,22,0.25)`,
            animationDelay: '0.15s',
          }}
        >
          <ShieldOff size={26} style={{ color: ACCENT }} />
        </div>

        {/* Text */}
        <h2
          className="fb-fade-up text-2xl sm:text-3xl font-bold mb-3"
          style={{ color: 'var(--text-primary)', animationDelay: '0.2s' }}
        >
          Acceso denegado
        </h2>
        <p
          className="fb-fade-up text-sm sm:text-base leading-relaxed mb-10"
          style={{ color: 'var(--text-secondary)', animationDelay: '0.32s' }}
        >
          No tienes los permisos necesarios para ver esta página.
          <br className="hidden sm:block" />
          Si crees que esto es un error, contacta al administrador del sistema.
        </p>

        {/* Info badge */}
        <div
          className="fb-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium mb-8"
          style={{
            background: `rgba(249,115,22,0.08)`,
            border: `1px solid rgba(249,115,22,0.2)`,
            color: ACCENT,
            animationDelay: '0.4s',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACCENT }} />
          Tu sesión está activa, pero tu rol no tiene acceso a esta sección
        </div>

        {/* Button */}
        <div
          className="fb-fade-up"
          style={{ animationDelay: '0.5s' }}
        >
          <button
            onClick={handleHome}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_2}, ${ACCENT})`,
              boxShadow: `0 4px 14px rgba(249,115,22,0.35)`,
            }}
          >
            <Home size={15} />
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
