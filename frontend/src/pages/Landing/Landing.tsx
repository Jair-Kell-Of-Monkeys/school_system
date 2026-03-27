import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { ROUTES } from '@/config/constants';
import {
  Sun, Moon, Menu, X, ArrowRight, ChevronDown,
  FileText, CreditCard, BookOpen, GraduationCap, IdCard, Users,
  Shield, Zap, Eye, BarChart3, CheckCircle, Mail, Phone, MapPin,
  ClipboardList, Award,
} from 'lucide-react';

// ── Keyframe styles injected once ─────────────────────────────────────────

const ANIMATION_CSS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideRight {
  from { opacity: 0; transform: translateX(-24px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes floatSlow {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
}
.anim-fade-up   { animation: fadeUp    0.6s ease both; }
.anim-fade-in   { animation: fadeIn    0.5s ease both; }
.anim-slide-right { animation: slideRight 0.6s ease both; }
.anim-float     { animation: floatSlow 6s ease-in-out infinite; }
`;

// ── useInView hook ─────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── useCountUp ─────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ value, suffix, label, active, delay }: {
  value: number; suffix: string; label: string; active: boolean; delay: string;
}) {
  const count = useCountUp(value, active);
  return (
    <div
      className="text-center p-6 rounded-2xl anim-fade-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        animationDelay: delay,
        animationPlayState: active ? 'running' : 'paused',
      }}
    >
      <p className="text-4xl font-extrabold mb-1" style={{ color: '#6366f1' }}>
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  { icon: Users,        label: 'Registro',       desc: 'Crea tu cuenta de aspirante en minutos con tus datos personales.' },
  { icon: FileText,     label: 'Pre-inscripción', desc: 'Inicia tu solicitud seleccionando el programa y periodo de interés.' },
  { icon: ClipboardList,label: 'Documentos',      desc: 'Sube digitalmente todos los documentos requeridos para tu expediente.' },
  { icon: CreditCard,   label: 'Pago',            desc: 'Realiza el pago de derechos y espera la validación del área de finanzas.' },
  { icon: BookOpen,     label: 'Examen',          desc: 'Presenta el examen de admisión en la fecha y sede asignada.' },
  { icon: GraduationCap,label: 'Inscripción',     desc: 'Al ser aceptado, formaliza tu inscripción y obtén tu matrícula.' },
  { icon: IdCard,       label: 'Credencial',      desc: 'Solicita y descarga tu credencial estudiantil oficial de forma digital.' },
];

const MODULES = [
  { icon: Users,        title: 'Gestión de Aspirantes',   desc: 'Administra perfiles, documentos y el estado de cada aspirante desde un panel centralizado.' },
  { icon: FileText,     title: 'Control de Documentos',   desc: 'Validación digital de expedientes con aprobación o rechazo con observaciones detalladas.' },
  { icon: CreditCard,   title: 'Módulo de Pagos',         desc: 'Verificación de comprobantes de pago con trazabilidad completa del proceso de cobro.' },
  { icon: BookOpen,     title: 'Examen de Admisión',      desc: 'Programación de sesiones, asignación de sedes y calificación directa desde el sistema.' },
  { icon: GraduationCap,title: 'Inscripción Formal',      desc: 'Generación automática de matrícula, grupos y horarios para alumnos aceptados.' },
  { icon: Award,        title: 'Credencialización',       desc: 'Convocatorias de credencial y descarga de identificación estudiantil con QR institucional.' },
];

const WHY_ITEMS = [
  { icon: Shield,   color: '#6366f1', title: 'Seguridad institucional',  desc: 'Autenticación JWT, roles diferenciados y control de acceso granular para cada área.' },
  { icon: Zap,      color: '#f59e0b', title: 'Procesos ágiles',          desc: 'Automatización de notificaciones por correo y flujos de trabajo sin papel.' },
  { icon: Eye,      color: '#22c55e', title: 'Transparencia total',      desc: 'El aspirante tiene visibilidad en tiempo real de cada etapa de su proceso.' },
  { icon: BarChart3,color: '#ec4899', title: 'Trazabilidad completa',    desc: 'Historial de acciones, exportación de datos y reportes para la toma de decisiones.' },
];

// ── Landing ────────────────────────────────────────────────────────────────

export const Landing = () => {
  const { theme, toggle: toggleTheme } = useTheme();
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  const statsSection  = useInView(0.2);
  const processSection = useInView(0.1);
  const modulesSection = useInView(0.1);
  const whySection     = useInView(0.1);
  const ctaSection     = useInView(0.1);

  // Scroll-based navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const NAV_LINKS = [
    { label: 'Inicio',   id: 'hero' },
    { label: 'Proceso',  id: 'process' },
    { label: 'Módulos',  id: 'modules' },
    { label: 'Contacto', id: 'contact' },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <style>{ANIMATION_CSS}</style>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? (theme === 'dark' ? 'rgba(8,13,32,0.92)' : 'rgba(240,242,255,0.92)')
            : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              U
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Sistema Universitario
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-sm font-medium transition-colors hover:text-indigo-500"
                style={{ color: 'var(--text-secondary)' }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <Link
              to={ROUTES.LOGIN}
              className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              Iniciar Sesión <ArrowRight size={13} />
            </Link>
            <button
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden px-6 pb-4 pt-2 space-y-1"
            style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {l.label}
              </button>
            ))}
            <Link
              to={ROUTES.LOGIN}
              className="flex items-center justify-center gap-1.5 w-full mt-2 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
              onClick={() => setMenuOpen(false)}
            >
              Iniciar Sesión <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center overflow-hidden pt-16"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* Background geometric decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="absolute right-0 top-0 w-1/2 h-full opacity-40 dark:opacity-20"
            viewBox="0 0 600 900"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="500" cy="200" r="300" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.15" />
            <circle cx="500" cy="200" r="200" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.2" />
            <circle cx="500" cy="200" r="100" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.25" />
            <circle cx="200" cy="700" r="200" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.12" />
            <circle cx="100" cy="400" r="4" fill="#6366f1" opacity="0.4" />
            <circle cx="450" cy="550" r="3" fill="#818cf8" opacity="0.35" />
            <circle cx="300" cy="150" r="2.5" fill="#6366f1" opacity="0.5" />
            <line x1="0" y1="300" x2="600" y2="300" stroke="#6366f1" strokeWidth="0.5" opacity="0.08" />
            <line x1="0" y1="600" x2="600" y2="600" stroke="#6366f1" strokeWidth="0.5" opacity="0.08" />
            <line x1="300" y1="0" x2="300" y2="900" stroke="#6366f1" strokeWidth="0.5" opacity="0.08" />
          </svg>
          {/* Gradient blob */}
          <div
            className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 anim-float"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div className="space-y-8">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold anim-fade-in"
              style={{
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                color: 'var(--color-info)',
                animationDelay: '0.1s',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Sistema de Gestión Universitaria
            </div>

            <h1
              className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight anim-fade-up"
              style={{ animationDelay: '0.2s', color: 'var(--text-primary)' }}
            >
              La admisión universitaria,{' '}
              <span style={{ color: '#6366f1' }}>digitalizada y</span>{' '}
              <span style={{ color: '#6366f1' }}>sin filas.</span>
            </h1>

            <p
              className="text-base sm:text-lg leading-relaxed anim-fade-up"
              style={{ color: 'var(--text-secondary)', animationDelay: '0.35s', maxWidth: '520px' }}
            >
              Gestiona todo tu proceso de admisión — desde el registro hasta la credencial estudiantil —
              desde un solo portal seguro, rápido y accesible.
            </p>

            <div className="flex flex-wrap gap-3 anim-fade-up" style={{ animationDelay: '0.5s' }}>
              <Link
                to={ROUTES.LOGIN}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
                }}
              >
                Iniciar Sesión <ArrowRight size={15} />
              </Link>
              <button
                onClick={() => scrollTo('process')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Conocer más <ChevronDown size={15} />
              </button>
            </div>
          </div>

          {/* Right — decorative card stack */}
          <div className="hidden lg:flex justify-center items-center relative h-96 anim-fade-in" style={{ animationDelay: '0.4s' }}>
            {/* Background card */}
            <div
              className="absolute top-8 right-8 w-72 h-56 rounded-2xl rotate-3 opacity-50"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            />
            {/* Middle card */}
            <div
              className="absolute top-4 right-4 w-72 h-56 rounded-2xl -rotate-1 opacity-75"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            />
            {/* Front card */}
            <div
              className="relative w-80 rounded-2xl p-6 shadow-2xl anim-float"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <GraduationCap size={20} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    Mi Solicitud de Admisión
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ingeniería en Sistemas</p>
                </div>
              </div>
              {/* Fake progress stepper */}
              <div className="flex items-center gap-1 mb-4">
                {['Docs', 'Pago', 'Examen', 'Inscripción'].map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: i < 3 ? '#6366f1' : 'var(--border)' }}
                    >
                      {i < 2 ? <CheckCircle size={10} /> : i + 1}
                    </div>
                    {i < 3 && (
                      <div
                        className="flex-1 h-0.5 rounded"
                        style={{ background: i < 2 ? '#6366f1' : 'var(--border)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Estado',    value: 'Examen asignado', color: '#f59e0b' },
                  { label: 'Programa',  value: 'ING-SIS-2026A',   color: 'var(--text-muted)' },
                  { label: 'Fecha',     value: '15 Abr 2026',     color: 'var(--text-muted)' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="font-semibold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <button
          onClick={() => scrollTo('process')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-xs font-medium">Descubrir</span>
          <ChevronDown size={18} className="animate-bounce" />
        </button>
      </section>

      {/* ── Process timeline ────────────────────────────────────────────── */}
      <section id="process" className="py-24" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-6" ref={processSection.ref}>
          <div className="text-center mb-16">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: '#6366f1' }}
            >
              Proceso de Admisión
            </p>
            <h2
              className={`text-3xl sm:text-4xl font-extrabold mb-4 ${processSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ color: 'var(--text-primary)' }}
            >
              Del registro a la credencial
            </h2>
            <p
              className={`text-base mx-auto ${processSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ color: 'var(--text-secondary)', maxWidth: '520px', animationDelay: '0.15s' }}
            >
              Siete pasos claros, completamente digitales. Sigue tu avance en tiempo real desde el portal.
            </p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connector line (desktop) */}
            <div
              className="hidden lg:block absolute top-10 left-0 right-0 h-px"
              style={{ background: 'var(--border)', zIndex: 0 }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6">
              {PROCESS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const delay = `${i * 0.08}s`;
                return (
                  <div
                    key={step.label}
                    className={`flex flex-col items-center text-center relative ${processSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: delay }}
                  >
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative z-10 transition-transform hover:scale-105"
                      style={{ background: 'var(--bg-base)', border: '2px solid #6366f1' }}
                    >
                      <Icon size={28} style={{ color: '#6366f1' }} />
                      <div
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: '#6366f1' }}
                      >
                        {i + 1}
                      </div>
                    </div>
                    <p className="font-bold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      {step.label}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules grid ────────────────────────────────────────────────── */}
      <section id="modules" className="py-24" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-7xl mx-auto px-6" ref={modulesSection.ref}>
          <div className="text-center mb-16">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: '#6366f1' }}
            >
              Módulos del Sistema
            </p>
            <h2
              className={`text-3xl sm:text-4xl font-extrabold mb-4 ${modulesSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ color: 'var(--text-primary)' }}
            >
              Todo lo que necesitas, en un solo lugar
            </h2>
            <p
              className={`text-base mx-auto ${modulesSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ color: 'var(--text-secondary)', maxWidth: '520px', animationDelay: '0.15s' }}
            >
              Cada área del proceso tiene su propio módulo especializado, integrado en un flujo cohesivo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              const delay = `${i * 0.07}s`;
              return (
                <div
                  key={mod.title}
                  className={`group rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${modulesSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    animationDelay: delay,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors"
                    style={{ background: 'rgba(99,102,241,0.1)' }}
                  >
                    <Icon size={22} style={{ color: '#6366f1' }} />
                  </div>
                  <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                    {mod.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {mod.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why section ─────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-6" ref={whySection.ref}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: '#6366f1' }}
              >
                ¿Por qué este sistema?
              </p>
              <h2
                className={`text-3xl sm:text-4xl font-extrabold mb-6 ${whySection.visible ? 'anim-slide-right' : 'opacity-0'}`}
                style={{ color: 'var(--text-primary)' }}
              >
                Diseñado para la institución moderna.
              </h2>
              <p
                className="text-base leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Un sistema integral que elimina el papeleo, reduce errores humanos y ofrece una experiencia
                digital de primer nivel tanto para aspirantes como para el personal administrativo.
              </p>
            </div>

            {/* Right grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WHY_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`rounded-2xl p-5 ${whySection.visible ? 'anim-fade-up' : 'opacity-0'}`}
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${item.color}18` }}
                    >
                      <Icon size={20} style={{ color: item.color }} />
                    </div>
                    <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-7xl mx-auto px-6" ref={statsSection.ref}>
          <div className="text-center mb-12">
            <h2
              className={`text-3xl sm:text-4xl font-extrabold ${statsSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ color: 'var(--text-primary)' }}
            >
              Resultados que hablan solos
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard value={1200} suffix="+"   label="Aspirantes gestionados"      active={statsSection.visible} delay="0s"    />
            <StatCard value={8500} suffix="+"   label="Documentos procesados"       active={statsSection.visible} delay="0.1s"  />
            <StatCard value={98}   suffix="%"   label="Tasa de satisfacción"        active={statsSection.visible} delay="0.2s"  />
            <StatCard value={24}   suffix=" hr" label="Tiempo promedio de respuesta" active={statsSection.visible} delay="0.3s" />
          </div>
        </div>
      </section>

      {/* ── CTA / Contact ───────────────────────────────────────────────── */}
      <section
        id="contact"
        className="py-24"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="max-w-7xl mx-auto px-6" ref={ctaSection.ref}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* CTA card */}
            <div
              className={`rounded-3xl p-10 relative overflow-hidden ${ctaSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)' }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <svg viewBox="0 0 400 300" className="w-full h-full">
                  <circle cx="350" cy="50"  r="120" fill="none" stroke="white" strokeWidth="1" />
                  <circle cx="50"  cy="250" r="100" fill="none" stroke="white" strokeWidth="1" />
                </svg>
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                  ¿Listo para comenzar tu proceso?
                </h2>
                <p className="text-sm text-indigo-100 mb-8 leading-relaxed">
                  Crea tu cuenta de aspirante en menos de 5 minutos y empieza tu proceso de admisión hoy mismo.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={ROUTES.LOGIN}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-indigo-700 transition-all hover:scale-105"
                    style={{ background: 'white' }}
                  >
                    Iniciar Sesión <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={ROUTES.REGISTER}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                    style={{ border: '2px solid rgba(255,255,255,0.5)' }}
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div
              className={`space-y-6 ${ctaSection.visible ? 'anim-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: '0.15s' }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6366f1' }}>
                  Contacto
                </p>
                <h3 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
                  ¿Tienes dudas?
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  El personal de Servicios Escolares puede orientarte en cada etapa del proceso.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Mail,   text: 'servicios.escolares@universidad.edu.mx' },
                  { icon: Phone,  text: '+52 (000) 000-0000 ext. 1234' },
                  { icon: MapPin, text: 'Edificio Central, Planta Baja, Ventanilla 3' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.1)' }}
                    >
                      <Icon size={15} style={{ color: '#6366f1' }} />
                    </div>
                    <p className="text-sm pt-1" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="py-10 border-t"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              U
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Sistema Universitario
            </span>
          </div>

          <div className="flex items-center gap-6">
            {[
              { label: 'Inicio',   id: 'hero' },
              { label: 'Proceso',  id: 'process' },
              { label: 'Módulos',  id: 'modules' },
              { label: 'Contacto', id: 'contact' },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-xs transition-colors hover:text-indigo-500"
                style={{ color: 'var(--text-muted)' }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © 2026 Universidad Tecnológica
          </p>
        </div>
      </footer>

    </div>
  );
};
