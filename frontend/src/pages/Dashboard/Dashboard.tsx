import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { ROLES, ROUTES } from '@/config/constants';
import { staffService } from '@/services/staff/staffService';
import { studentsService } from '@/services/students/studentsService';
import { preEnrollmentsService } from '@/services/preEnrollments/preEnrollmentsService';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { paymentsService } from '@/services/payments/paymentsService';
import { enrollmentsService } from '@/services/enrollments/enrollmentsService';
import type { MyApplication, EnrollmentDetail } from '@/types';
import {
  GraduationCap,
  FileText,
  TrendingUp,
  ArrowRight,
  UserCog,
  AlertCircle,
  DollarSign,
  CheckCircle,
  XCircle,
  IdCard,
  Clock,
  BookOpen,
  CalendarDays,
  MapPin,
} from 'lucide-react';

// ── Process steps ────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  'Registro',
  'Pre-inscripción',
  'Documentos',
  'Pago',
  'Examen',
  'Inscripción',
  'Credencial',
];

function getActiveStep(app: MyApplication | null, enrollment: EnrollmentDetail | null): number {
  if (enrollment) {
    if (['enrolled', 'active'].includes(enrollment.status)) return 6;
    if (enrollment.status === 'pending_docs') return 5;
  }
  if (!app) return 1;
  const map: Record<string, number> = {
    draft: 1,
    submitted: 2,
    under_review: 2,
    documents_pending: 2,
    payment_pending: 3,
    payment_uploaded: 3,
    payment_validated: 4,
    exam_scheduled: 4,
    accepted: 5,
  };
  return map[app.status] ?? 1;
}

interface NextAction {
  title: string;
  description: string;
  actionLabel: string;
  path: string;
  color: 'info' | 'success' | 'warning' | 'danger';
}

function getNextAction(
  app: MyApplication | null,
  enrollment: EnrollmentDetail | null,
): NextAction {
  if (enrollment) {
    if (['enrolled', 'active'].includes(enrollment.status)) {
      return {
        title: '¡Eres alumno inscrito!',
        description: 'Tu inscripción está completa. Puedes solicitar tu credencial estudiantil en el portal.',
        actionLabel: 'Ver mi inscripción',
        path: '/my-application',
        color: 'success',
      };
    }
    if (enrollment.status === 'pending_docs') {
      return {
        title: 'Sube tus documentos de inscripción',
        description: 'Debes entregar los documentos requeridos para completar tu inscripción formal.',
        actionLabel: 'Subir documentos',
        path: '/my-application',
        color: 'warning',
      };
    }
  }
  if (!app) {
    return {
      title: 'Inicia tu proceso de admisión',
      description: 'No tienes ninguna solicitud activa. Crea una pre-inscripción para comenzar.',
      actionLabel: 'Crear solicitud',
      path: '/my-application',
      color: 'info',
    };
  }
  const actions: Record<string, NextAction> = {
    draft: {
      title: 'Completa y envía tu solicitud',
      description: 'Tienes una solicitud en borrador. Revísala y envíala para continuar el proceso de admisión.',
      actionLabel: 'Ver solicitud',
      path: '/my-application',
      color: 'warning',
    },
    submitted: {
      title: 'Solicitud enviada — en revisión',
      description: 'Tu solicitud fue enviada y está siendo revisada por el equipo de admisiones.',
      actionLabel: 'Ver estado',
      path: '/my-application',
      color: 'info',
    },
    under_review: {
      title: 'Documentos en revisión',
      description: 'El equipo está verificando tus documentos. Recibirás una notificación al correo cuando haya novedades.',
      actionLabel: 'Ver estado',
      path: '/my-application',
      color: 'info',
    },
    documents_pending: {
      title: 'Se requieren documentos adicionales',
      description: 'Debes subir los documentos que se te solicitan para continuar con tu solicitud.',
      actionLabel: 'Subir documentos',
      path: '/my-application',
      color: 'warning',
    },
    payment_pending: {
      title: 'Realiza tu pago de examen',
      description: 'Genera tu ficha de pago, realiza el depósito bancario y sube el comprobante en el portal.',
      actionLabel: 'Ir a mi solicitud',
      path: '/my-application',
      color: 'warning',
    },
    payment_uploaded: {
      title: 'Comprobante en validación',
      description: 'Tu comprobante de pago está siendo revisado por el área de Finanzas. Recibirás confirmación pronto.',
      actionLabel: 'Ver estado',
      path: '/my-application',
      color: 'info',
    },
    payment_validated: {
      title: 'Pago validado — espera tu fecha de examen',
      description: 'Tu pago fue confirmado. Próximamente recibirás por correo electrónico la fecha, hora y lugar de tu examen de admisión.',
      actionLabel: 'Ver solicitud',
      path: '/my-application',
      color: 'info',
    },
    exam_scheduled: {
      title: 'Tienes examen de admisión programado',
      description: app?.exam_date
        ? `Fecha: ${new Date(app.exam_date).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}${app.exam_location ? ` · ${app.exam_location}` : ''}`
        : 'Revisa los detalles de tu examen en tu solicitud.',
      actionLabel: 'Ver detalles',
      path: '/my-application',
      color: 'info',
    },
    accepted: {
      title: '¡Felicidades, fuiste aceptado!',
      description: 'Superaste el proceso de admisión. El equipo de Servicios Escolares procesará tu inscripción formal.',
      actionLabel: 'Ver inscripción',
      path: '/my-application',
      color: 'success',
    },
    rejected: {
      title: 'Solicitud no aceptada en este proceso',
      description: 'Tu solicitud no fue aceptada en esta convocatoria. Puedes intentarlo en el próximo proceso de admisión.',
      actionLabel: 'Ver detalles',
      path: '/my-application',
      color: 'danger',
    },
  };
  return (
    actions[app.status] ?? {
      title: 'Continúa tu proceso',
      description: 'Revisa el estado actual de tu solicitud de admisión.',
      actionLabel: 'Ver solicitud',
      path: '/my-application',
      color: 'info',
    }
  );
}

// ── Process Stepper component ─────────────────────────────────────────────────

interface StepperProps {
  activeStep: number;
  isRejected?: boolean;
}

const ProcessStepper = ({ activeStep, isRejected = false }: StepperProps) => (
  <div className="overflow-x-auto py-2">
    <div className="flex items-start justify-start sm:justify-center min-w-max px-2">
      {PROCESS_STEPS.map((label, idx) => {
        const done = idx < activeStep;
        const current = idx === activeStep;
        const pending = idx > activeStep;

        let circleClass = '';
        let textStyle: React.CSSProperties = {};
        if (done) {
          circleClass = 'bg-green-500 text-white';
          textStyle = { color: 'var(--color-success)' };
        } else if (current && isRejected) {
          circleClass = 'bg-red-500 text-white';
          textStyle = { color: 'var(--color-danger)' };
        } else if (current) {
          circleClass = 'bg-indigo-600 text-white shadow-md';
          textStyle = { color: '#6366f1' };
        } else {
          circleClass = 'text-xs font-semibold';
          textStyle = { color: 'var(--text-muted)' };
        }

        return (
          <div key={label} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${circleClass} ${
                  current && !isRejected ? 'ring-4 ring-indigo-100 dark:ring-indigo-900/40' : ''
                } ${pending ? 'border-2' : ''}`}
                style={
                  pending
                    ? { background: 'var(--bg-surface-3)', borderColor: 'var(--border)' }
                    : undefined
                }
              >
                {done ? (
                  <CheckCircle size={16} />
                ) : current && isRejected ? (
                  <XCircle size={16} />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap text-center"
                style={textStyle}
              >
                {label}
              </span>
            </div>

            {idx < PROCESS_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mx-1 mt-4 flex-shrink-0 rounded-full ${
                  done ? 'bg-green-400' : ''
                }`}
                style={!done ? { background: 'var(--border)' } : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// ── Next Action color map ────────────────────────────────────────────────────

const ACTION_STYLES: Record<
  NextAction['color'],
  { bg: string; border: string; title: string; icon: string }
> = {
  info: {
    bg: 'var(--color-info-bg)',
    border: 'var(--color-info-border)',
    title: 'var(--color-info)',
    icon: 'var(--color-info)',
  },
  success: {
    bg: 'var(--color-success-bg)',
    border: 'var(--color-success-border)',
    title: 'var(--color-success)',
    icon: 'var(--color-success)',
  },
  warning: {
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
    title: 'var(--color-warning)',
    icon: 'var(--color-warning)',
  },
  danger: {
    bg: 'var(--color-danger-bg)',
    border: 'var(--color-danger-border)',
    title: 'var(--color-danger)',
    icon: 'var(--color-danger)',
  },
};

const ACTION_ICON: Record<NextAction['color'], React.ReactNode> = {
  info: <Clock size={20} />,
  success: <CheckCircle size={20} />,
  warning: <AlertCircle size={20} />,
  danger: <XCircle size={20} />,
};

// ── Dashboard: Alumno / Aspirante ─────────────────────────────────────────────

interface AlumnoDashboardProps {
  myApplication: MyApplication | null;
  myEnrollment: EnrollmentDetail | null;
}

const AlumnoDashboard = ({ myApplication, myEnrollment }: AlumnoDashboardProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const isEnrolled =
    myEnrollment != null &&
    ['enrolled', 'active'].includes(myEnrollment.status);

  const activeStep = getActiveStep(myApplication, myEnrollment);
  const isRejected = myApplication?.status === 'rejected';
  const nextAction = getNextAction(myApplication, myEnrollment);
  const actionStyle = ACTION_STYLES[nextAction.color];

  // Greeting name: prefer enrollment's student_name, else email prefix
  const displayName = myEnrollment?.student_name ?? user?.email ?? '';

  return (
    <div className="space-y-6">
      {/* ── Header de bienvenida ── */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, #0F1C4D 0%, #1a2f7a 100%)',
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1" style={{ color: '#A5B4D4' }}>
            {user?.role === ROLES.ALUMNO ? 'Alumno inscrito' : 'Aspirante'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
            Bienvenido{displayName ? `, ${displayName.split('@')[0]}` : ''}
          </h1>
          {isEnrolled && myEnrollment?.matricula && (
            <p className="text-sm mt-1" style={{ color: '#A5B4D4' }}>
              Matrícula: <span className="font-semibold text-white">{myEnrollment.matricula}</span>
            </p>
          )}
          {!isEnrolled && (
            <p className="text-sm mt-1.5" style={{ color: '#8da4cc' }}>
              {isRejected
                ? 'Tu proceso de admisión ha concluido.'
                : 'Sigue los pasos para completar tu proceso de admisión.'}
            </p>
          )}
        </div>
        <GraduationCap size={52} className="flex-shrink-0 opacity-30 text-white hidden sm:block" />
      </div>

      {/* ── Barra de progreso del proceso ── */}
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Tu progreso en el proceso de admisión
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {isRejected
              ? 'Tu solicitud no fue aceptada en este proceso.'
              : `Etapa actual: ${PROCESS_STEPS[activeStep]}`}
          </p>
        </div>
        <ProcessStepper activeStep={activeStep} isRejected={isRejected} />
      </Card>

      {/* ── Tarjetas de información rápida (solo si está enrolled) ── */}
      {isEnrolled && myEnrollment && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4 border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <IdCard size={16} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Matrícula
              </p>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {myEnrollment.matricula}
            </p>
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Programa
              </p>
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              {myEnrollment.program_code} — {myEnrollment.program_name}
            </p>
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Periodo
              </p>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {myEnrollment.period_name}
            </p>
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Correo institucional
              </p>
            </div>
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
              title={myEnrollment.institutional_email ?? '—'}
            >
              {myEnrollment.institutional_email ?? (
                <span style={{ color: 'var(--text-muted)' }}>Pendiente de asignar</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Próxima acción destacada ── */}
      <div
        className="rounded-2xl p-5 border flex items-start gap-4"
        style={{
          background: actionStyle.bg,
          borderColor: actionStyle.border,
        }}
      >
        <div className="flex-shrink-0 mt-0.5" style={{ color: actionStyle.icon }}>
          {ACTION_ICON[nextAction.color]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-1" style={{ color: actionStyle.title }}>
            {nextAction.title}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {nextAction.description}
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => navigate(nextAction.path)}
          className="flex-shrink-0"
        >
          {nextAction.actionLabel}
          <ArrowRight size={14} className="ml-1.5" />
        </Button>
      </div>

    </div>
  );
};

// ── Dashboard: Finanzas ───────────────────────────────────────────────────────

const FinanzasDashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ['payments-stats'],
    queryFn: paymentsService.getStats,
  });

  const formatAmount = (amount?: string) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(parseFloat(amount));
  };

  const statCards = [
    {
      label: 'Pendientes de validar',
      value: stats?.pending ?? '—',
      sub: stats?.pending_amount ? `${formatAmount(stats.pending_amount)} en espera` : undefined,
      icon: <Clock size={28} className="text-yellow-500" />,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      border: 'var(--color-warning-border)',
    },
    {
      label: 'Validados',
      value: stats?.validated ?? '—',
      sub: undefined,
      icon: <CheckCircle size={28} className="text-green-500" />,
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
      border: 'var(--color-success-border)',
    },
    {
      label: 'Rechazados',
      value: stats?.rejected ?? '—',
      sub: undefined,
      icon: <XCircle size={28} className="text-red-500" />,
      color: 'var(--color-danger)',
      bg: 'var(--color-danger-bg)',
      border: 'var(--color-danger-border)',
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Módulo de Finanzas
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {user?.email} · Validación de comprobantes de pago
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-5 border flex items-center gap-4"
            style={{ background: card.bg, borderColor: card.border }}
          >
            <div className="flex-shrink-0">{card.icon}</div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: card.color }}>
                {card.label}
              </p>
              <p className="text-3xl font-bold mt-0.5" style={{ color: card.color }}>
                {card.value}
              </p>
              {card.sub && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {card.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Alerta de pendientes */}
      {stats && stats.pending > 0 && (
        <div
          className="rounded-2xl p-5 border flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: 'var(--color-warning-bg)',
            borderColor: 'var(--color-warning-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={22} style={{ color: 'var(--color-warning)' }} className="flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-warning)' }}>
                {stats.pending} comprobante{stats.pending !== 1 ? 's' : ''} esperando validación
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Monto total pendiente: <strong>{formatAmount(stats.pending_amount)}</strong>
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/payments')}>
            Validar ahora
            <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </div>
      )}

      {/* Acceso rápido */}
      <Card>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Acceso rápido
        </h2>
        <button
          onClick={() => navigate('/payments')}
          className="flex items-center gap-4 p-4 rounded-xl border w-full text-left transition-all hover:shadow-md sm:max-w-sm"
          style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-info-bg)' }}
          >
            <DollarSign size={24} style={{ color: 'var(--color-info)' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Validar Pagos
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Revisar y validar comprobantes de pago de aspirantes
            </p>
          </div>
          <ArrowRight size={18} className="ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        </button>
      </Card>
    </div>
  );
};

// ── Dashboard principal ───────────────────────────────────────────────────────

export const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const isAlumnoOrAspirante =
    user?.role === ROLES.ASPIRANTE || user?.role === ROLES.ALUMNO;
  const isJefeOrAdmin = user?.role === ROLES.JEFE_SERVICIOS || user?.role === ROLES.ADMIN;
  const isEncargado = user?.role === ROLES.SERVICIOS_ESCOLARES;
  const isFinanzas = user?.role === ROLES.FINANZAS;

  // Datos para alumno/aspirante
  const { data: myApplication = null } = useQuery({
    queryKey: ['my-application'],
    queryFn: aspirantService.getMyApplication,
    enabled: isAlumnoOrAspirante,
    retry: false,
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollment'],
    queryFn: enrollmentsService.getMyEnrollments,
    enabled: isAlumnoOrAspirante,
    retry: false,
  });
  const myEnrollment = myEnrollments[0] ?? null;

  // Datos para admin/jefe/encargado
  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: staffService.getStats,
    enabled: isJefeOrAdmin,
  });

  const { data: studentsStats } = useQuery({
    queryKey: ['students-stats'],
    queryFn: studentsService.getStats,
    enabled: isJefeOrAdmin || isEncargado,
  });

  const { data: preEnrollmentsStats } = useQuery({
    queryKey: ['pre-enrollments-stats'],
    queryFn: preEnrollmentsService.getStats,
    enabled: isJefeOrAdmin || isEncargado,
  });

  // ── Render según rol ──

  if (isAlumnoOrAspirante) {
    return (
      <AlumnoDashboard
        myApplication={myApplication}
        myEnrollment={myEnrollment}
      />
    );
  }

  if (isFinanzas) {
    return <FinanzasDashboard />;
  }

  // ── Dashboard para Admin, Jefa de Servicios y Encargados ──────────────────
  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {isJefeOrAdmin ? 'Panel de Control' : 'Panel de Encargado'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {user?.email} · {user?.role_display}
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isJefeOrAdmin && staffStats && (
          <>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Encargados</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                    {staffStats.total_encargados}
                  </p>
                </div>
                <UserCog className="text-primary-600" size={40} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate(ROUTES.STAFF)}
              >
                Ver todos <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sin Programas</p>
                  <p className="text-3xl font-bold mt-2 text-yellow-600">
                    {staffStats.encargados_sin_programas}
                  </p>
                </div>
                <AlertCircle className="text-yellow-600" size={40} />
              </div>
              {staffStats.encargados_sin_programas > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(ROUTES.STAFF)}
                >
                  Asignar programas <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </Card>
          </>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isEncargado ? 'Mis Estudiantes' : 'Estudiantes'}
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                {studentsStats?.total || 0}
              </p>
            </div>
            <GraduationCap className="text-primary-600" size={40} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate(ROUTES.STUDENTS)}
          >
            Ver lista <ArrowRight size={16} className="ml-2" />
          </Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pre-inscripciones</p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                {preEnrollmentsStats?.total || 0}
              </p>
            </div>
            <FileText className="text-primary-600" size={40} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate(ROUTES.PRE_ENROLLMENTS)}
          >
            Gestionar <ArrowRight size={16} className="ml-2" />
          </Button>
        </Card>
      </div>

      {/* Acciones pendientes */}
      {preEnrollmentsStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>En Revisión</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {preEnrollmentsStats.by_status?.under_review || 0}
                </p>
              </div>
              <div className="text-3xl">👀</div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Solicitudes esperando revisión de documentos
            </p>
          </Card>

          <Card className="border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Exámenes Programados</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {preEnrollmentsStats.by_status?.exam_scheduled || 0}
                </p>
              </div>
              <div className="text-3xl">📝</div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Aspirantes con examen pendiente
            </p>
          </Card>

          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tasa de Aceptación</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {preEnrollmentsStats.acceptance_rate
                    ? `${Math.round(preEnrollmentsStats.acceptance_rate)}%`
                    : '—'}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {preEnrollmentsStats.by_status?.accepted || 0} aspirantes aceptados
            </p>
          </Card>
        </div>
      )}

      {/* Accesos rápidos */}
      <Card>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isJefeOrAdmin && (
            <button
              onClick={() => navigate(ROUTES.STAFF)}
              className="p-4 border rounded-lg hover:shadow-md transition-all text-left"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)' }}
            >
              <UserCog className="text-primary-600 mb-2" size={24} />
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Gestionar Encargados</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Asignar programas y permisos
              </p>
            </button>
          )}

          <button
            onClick={() => navigate(ROUTES.STUDENTS)}
            className="p-4 border rounded-lg hover:shadow-md transition-all text-left"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)' }}
          >
            <GraduationCap className="text-primary-600 mb-2" size={24} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {isEncargado ? 'Mis Estudiantes' : 'Ver Estudiantes'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Lista completa de aspirantes y alumnos
            </p>
          </button>

          <button
            onClick={() => navigate(ROUTES.PRE_ENROLLMENTS)}
            className="p-4 border rounded-lg hover:shadow-md transition-all text-left"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)' }}
          >
            <FileText className="text-primary-600 mb-2" size={24} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Pre-inscripciones</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Revisar y gestionar solicitudes
            </p>
          </button>
        </div>
      </Card>
    </div>
  );
};
