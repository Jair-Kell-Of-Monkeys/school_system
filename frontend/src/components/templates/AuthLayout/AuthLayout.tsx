import type { ReactNode } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Theme toggle ─────────────────────────────────────────────────── */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* ── Left decorative panel ──────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F1C4D 0%, #0a1234 60%, #06091a 100%)' }}
      >
        {/* Geometric decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            {/* Large rings */}
            <circle cx="400" cy="120" r="180" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
            <circle cx="400" cy="120" r="120" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="400" cy="120" r="60"  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Bottom cluster */}
            <circle cx="60"  cy="780" r="220" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
            <circle cx="60"  cy="780" r="140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            {/* Accent dots */}
            <circle cx="240" cy="450" r="3" fill="rgba(99,102,241,0.5)" />
            <circle cx="80"  cy="300" r="2" fill="rgba(99,102,241,0.35)" />
            <circle cx="380" cy="600" r="2" fill="rgba(99,102,241,0.35)" />
            <circle cx="160" cy="680" r="4" fill="rgba(99,102,241,0.25)" />
            {/* Grid lines subtle */}
            <line x1="0" y1="450" x2="480" y2="450" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            <line x1="240" y1="0" x2="240" y2="900" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          </svg>
        </div>

        {/* Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white text-lg">
              U
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Sistema</p>
              <p className="text-indigo-300 text-xs leading-tight">Universitario</p>
            </div>
          </div>
        </div>

        {/* Center message */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
              Tu futuro
              <br />
              <span style={{ color: '#818cf8' }}>comienza aquí.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Gestiona tu proceso de admisión, exámenes, inscripción y credencial desde un solo lugar.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-2.5">
            {[
              'Seguimiento de tu solicitud en tiempo real',
              'Carga y validación de documentos digitales',
              'Resultados de examen y aceptación',
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Universidad Tecnológica © 2026
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        {children}
      </div>

    </div>
  );
};
