import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';
import { ArrowLeft, Home, Compass } from 'lucide-react';

const ANIMATION_CSS = `
@keyframes nf-float-a {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-18px) rotate(8deg); }
}
@keyframes nf-float-b {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-12px) rotate(-6deg); }
}
@keyframes nf-float-c {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-8px) scale(1.08); }
}
@keyframes nf-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes nf-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes nf-pulse-ring {
  0%   { transform: scale(0.95); opacity: 0.6; }
  70%  { transform: scale(1.05); opacity: 0.2; }
  100% { transform: scale(0.95); opacity: 0.6; }
}
.nf-fade-up  { animation: nf-fade-up 0.6s ease both; }
.nf-float-a  { animation: nf-float-a 7s ease-in-out infinite; }
.nf-float-b  { animation: nf-float-b 5s ease-in-out infinite; }
.nf-float-c  { animation: nf-float-c 9s ease-in-out infinite; }
.nf-spin     { animation: nf-spin-slow 20s linear infinite; }
.nf-pulse    { animation: nf-pulse-ring 3s ease-in-out infinite; }
`;

export const NotFound = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleHome = () => navigate(isAuthenticated ? ROUTES.DASHBOARD : '/');
  const handleBack = () => navigate(-1);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <style>{ANIMATION_CSS}</style>

      {/* ── Decorative background ───────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Spinning ring */}
        <div
          className="nf-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ border: '1px solid rgba(99,102,241,0.08)' }}
        />
        <div
          className="nf-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full"
          style={{
            border: '1px dashed rgba(99,102,241,0.12)',
            animationDirection: 'reverse',
            animationDuration: '14s',
          }}
        />

        {/* Floating dots */}
        <div className="nf-float-a absolute top-16 left-16 w-4 h-4 rounded-full opacity-40"
          style={{ background: '#6366f1' }} />
        <div className="nf-float-b absolute top-32 right-24 w-3 h-3 rounded-full opacity-30"
          style={{ background: '#818cf8' }} />
        <div className="nf-float-c absolute bottom-24 left-28 w-5 h-5 rounded-full opacity-25"
          style={{ background: '#6366f1' }} />
        <div className="nf-float-a absolute bottom-16 right-16 w-2.5 h-2.5 rounded-full opacity-35"
          style={{ background: '#818cf8', animationDuration: '8s' }} />
        <div className="nf-float-b absolute top-1/2 left-8 w-3 h-3 rounded-full opacity-20"
          style={{ background: '#6366f1', animationDuration: '11s' }} />

        {/* Floating squares */}
        <div className="nf-float-c absolute top-20 right-40 w-6 h-6 rounded opacity-15"
          style={{ background: '#6366f1', transform: 'rotate(45deg)' }} />
        <div className="nf-float-a absolute bottom-32 right-48 w-4 h-4 rounded opacity-20"
          style={{ background: '#818cf8', transform: 'rotate(30deg)' }} />
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center px-6 max-w-lg w-full">

        {/* 404 number */}
        <div className="relative inline-block mb-6">
          {/* Pulse ring behind number */}
          <div
            className="nf-pulse absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
          />
          <h1
            className="relative text-[9rem] sm:text-[12rem] font-black leading-none select-none"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 40%, rgba(99,102,241,0.35) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </h1>
        </div>

        {/* Icon */}
        <div
          className="nf-fade-up w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            animationDelay: '0.1s',
          }}
        >
          <Compass size={26} style={{ color: '#6366f1' }} />
        </div>

        {/* Text */}
        <h2
          className="nf-fade-up text-2xl sm:text-3xl font-bold mb-3"
          style={{ color: 'var(--text-primary)', animationDelay: '0.2s' }}
        >
          Página no encontrada
        </h2>
        <p
          className="nf-fade-up text-sm sm:text-base leading-relaxed mb-10"
          style={{ color: 'var(--text-secondary)', animationDelay: '0.3s' }}
        >
          La página que buscas no existe, fue movida o la URL no es correcta.
          <br className="hidden sm:block" />
          Verifica la dirección o regresa a un lugar seguro.
        </p>

        {/* Buttons */}
        <div
          className="nf-fade-up flex flex-col sm:flex-row items-center justify-center gap-3"
          style={{ animationDelay: '0.42s' }}
        >
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 w-full sm:w-auto justify-center"
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft size={15} />
            Regresar
          </button>
          <button
            onClick={handleHome}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 w-full sm:w-auto justify-center"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
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
