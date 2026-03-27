import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { DocumentUploader } from '@/components/organisms/DocumentUploader/DocumentUploader';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { paymentsService } from '@/services/payments/paymentsService';
import { enrollmentsService } from '@/services/enrollments/enrollmentsService';
import { credentialsService } from '@/services/credentials/credentialsService';
import type { EnrollmentDetail } from '@/types';
import type { MyApplication as MyApplicationType } from '@/types';
import {
  FileText,
  Calendar,
  CheckCircle,
  Send,
  AlertCircle,
  CreditCard,
  Download,
  Upload,
  XCircle,
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  MapPin,
  IdCard,
  Mail,
  Users,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const ENROLLMENT_DOC_TYPES = [
  { key: 'numero_seguridad_social', label: 'Número de Seguridad Social' },
  { key: 'certificado_bachillerato', label: 'Certificado de Bachillerato Original' },
] as const;

const PAYMENT_STATUSES = ['payment_pending', 'payment_submitted', 'payment_validated'];
const ENROLLMENT_PAYMENT_STATUSES = ['payment_pending', 'payment_submitted', 'payment_validated'];

// ── Process stepper ──────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  'Registro',
  'Pre-inscripción',
  'Documentos',
  'Pago',
  'Examen',
  'Inscripción',
  'Credencial',
];

function getActiveStep(app: MyApplicationType, enrollment?: EnrollmentDetail): number {
  if (enrollment) {
    if (['enrolled', 'active'].includes(enrollment.status)) return 6;
    if (enrollment.status === 'pending_docs') return 5;
  }
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

interface StepperProps {
  activeStep: number;
  isRejected?: boolean;
}

const HorizontalStepper = ({ activeStep, isRejected = false }: StepperProps) => (
  <div className="overflow-x-auto py-2">
    <div className="flex items-start justify-start sm:justify-center min-w-max px-2">
      {PROCESS_STEPS.map((label, idx) => {
        const done = idx < activeStep;
        const current = idx === activeStep;
        const pending = idx > activeStep;

        let circleClass = '';
        let labelStyle: React.CSSProperties = {};
        if (done) {
          circleClass = 'bg-green-500 text-white';
          labelStyle = { color: 'var(--color-success)' };
        } else if (current && isRejected) {
          circleClass = 'bg-red-500 text-white';
          labelStyle = { color: 'var(--color-danger)' };
        } else if (current) {
          circleClass = 'bg-indigo-600 text-white shadow-md';
          labelStyle = { color: '#6366f1' };
        } else {
          circleClass = '';
          labelStyle = { color: 'var(--text-muted)' };
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
                  <CheckCircle size={15} />
                ) : current && isRejected ? (
                  <XCircle size={15} />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap text-center"
                style={labelStyle}
              >
                {label}
              </span>
            </div>
            {idx < PROCESS_STEPS.length - 1 && (
              <div
                className="h-0.5 w-8 sm:w-12 mx-1 mt-4 flex-shrink-0 rounded-full"
                style={{ background: done ? '#4ade80' : 'var(--border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// ── Score circle ─────────────────────────────────────────────────────────────

const ScoreCircle = ({ score, passingScore = 70 }: { score: number; passingScore?: number }) => {
  const passed = score >= passingScore;
  const color = passed ? 'var(--color-success)' : 'var(--color-danger)';
  const bg = passed ? 'var(--color-success-bg)' : 'var(--color-danger-bg)';
  const border = passed ? 'var(--color-success-border)' : 'var(--color-danger-border)';

  return (
    <div className="flex items-center gap-5">
      <div
        className="w-24 h-24 rounded-full flex flex-col items-center justify-center flex-shrink-0 border-4"
        style={{ background: bg, borderColor: border }}
      >
        <span className="text-3xl font-extrabold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          / 100
        </span>
      </div>
      <div>
        <p className="font-semibold text-base" style={{ color }}>
          {passed ? '¡Calificación aprobatoria!' : 'Calificación no aprobatoria'}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Mínimo requerido: {passingScore} puntos
        </p>
      </div>
    </div>
  );
};

// ── Alert callout ─────────────────────────────────────────────────────────────

type AlertColor = 'info' | 'success' | 'warning' | 'danger';

const alertStyles: Record<AlertColor, { bg: string; border: string; icon: string }> = {
  info:    { bg: 'var(--color-info-bg)',    border: 'var(--color-info-border)',    icon: 'var(--color-info)' },
  success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', icon: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', icon: 'var(--color-warning)' },
  danger:  { bg: 'var(--color-danger-bg)',  border: 'var(--color-danger-border)',  icon: 'var(--color-danger)' },
};

const Callout = ({
  color,
  icon,
  title,
  children,
}: {
  color: AlertColor;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => {
  const s = alertStyles[color];
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3 border"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <div className="flex-shrink-0 mt-0.5" style={{ color: s.icon }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: s.icon }}>
          {title}
        </p>
        <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Section title helper ──────────────────────────────────────────────────────

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
    >
      {icon}
    </div>
    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
      {title}
    </h2>
  </div>
);

// ── InfoCard helper ───────────────────────────────────────────────────────────

const InfoCard = ({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div
    className="rounded-xl p-4 border flex items-start gap-3"
    style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ background: 'var(--bg-surface-3)', color: 'var(--text-muted)' }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p
        className={`text-sm font-semibold mt-0.5 break-all ${mono ? 'font-mono tracking-wider' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  </div>
);

// ── Status badge variant ──────────────────────────────────────────────────────

function statusBadgeVariant(status: string): 'success' | 'danger' | 'info' | 'warning' {
  if (status === 'accepted' || status === 'enrolled' || status === 'active') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'documents_rejected') return 'danger';
  if (status === 'draft') return 'warning';
  return 'info';
}

// ── Main component ────────────────────────────────────────────────────────────

export const MyApplication = () => {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ program: '', period: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [isDownloadingSlip, setIsDownloadingSlip] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [enrollmentReceiptFile, setEnrollmentReceiptFile] = useState<File | null>(null);
  const [enrollmentPaymentDate, setEnrollmentPaymentDate] = useState('');
  const [isDownloadingEnrollSlip, setIsDownloadingEnrollSlip] = useState(false);
  const [isDownloadingEnrollReceipt, setIsDownloadingEnrollReceipt] = useState(false);
  const [isDownloadingComprobante, setIsDownloadingComprobante] = useState(false);
  const [enrollDocFiles, setEnrollDocFiles] = useState<Record<string, File | null>>({});
  const [isDownloadingCredential, setIsDownloadingCredential] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: application, isLoading } = useQuery({
    queryKey: ['my-application'],
    queryFn: aspirantService.getMyApplication,
    retry: false,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['available-programs'],
    queryFn: aspirantService.getAvailablePrograms,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['active-periods'],
    queryFn: aspirantService.getActivePeriods,
  });

  const { data: payment, isLoading: isPaymentLoading } = useQuery({
    queryKey: ['my-payment', application?.id],
    queryFn: () => paymentsService.getPaymentForPreEnrollment(application!.id),
    enabled: !!application && PAYMENT_STATUSES.includes(application.status),
  });

  const { data: myEnrollments } = useQuery({
    queryKey: ['my-enrollment'],
    queryFn: enrollmentsService.getMyEnrollments,
    enabled: !!application && application.status === 'accepted',
  });
  const enrollment: EnrollmentDetail | undefined = myEnrollments?.[0];

  const { data: enrollmentPayment, isLoading: isEnrollPaymentLoading } = useQuery({
    queryKey: ['enrollment-payment', application?.id],
    queryFn: () => paymentsService.getPaymentForPreEnrollment(application!.id),
    enabled: !!enrollment && ENROLLMENT_PAYMENT_STATUSES.includes(enrollment.status),
  });

  const { data: myCredentialRequests = [] } = useQuery({
    queryKey: ['my-credential-requests'],
    queryFn: credentialsService.getMyRequests,
    enabled: !!enrollment && enrollment.status === 'enrolled',
  });
  const myCredentialRequest = myCredentialRequests[0] ?? null;

  const { data: activeConvocatorias = [] } = useQuery({
    queryKey: ['active-convocatorias'],
    queryFn: () => credentialsService.getConvocatorias({ status: 'activa' }),
    enabled: !!enrollment && enrollment.status === 'enrolled' && !myCredentialRequest,
  });
  const activeConvocatoria = activeConvocatorias[0] ?? null;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      aspirantService.createApplication({
        program: parseInt(formData.program),
        period: parseInt(formData.period),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      setShowCreateForm(false);
      alert('Solicitud creada correctamente. Ahora puedes subir tus documentos.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => aspirantService.submitApplication(application!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      alert('Solicitud enviada correctamente. El equipo de admisiones revisará tus documentos.');
    },
  });

  const requestCredentialMutation = useMutation({
    mutationFn: (convocatoriaId: string) => credentialsService.createRequest(convocatoriaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-credential-requests'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Error al solicitar la credencial.');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: () =>
      paymentsService.createPayment({
        payment_type: 'examen_admision',
        pre_enrollment: application!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payment', application!.id] });
    },
    onError: () => {
      alert('Error al generar la ficha de pago. Intenta de nuevo.');
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: (data: FormData) => paymentsService.uploadReceipt(payment!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      queryClient.invalidateQueries({ queryKey: ['my-payment', application!.id] });
      setReceiptFile(null);
      setPaymentDate('');
      alert('Comprobante enviado correctamente. Tu pago está siendo revisado por finanzas.');
    },
    onError: () => {
      alert('Error al subir el comprobante. Intenta de nuevo.');
    },
  });

  const uploadEnrollDocMutation = useMutation({
    mutationFn: ({ docType, file }: { docType: string; file: File }) => {
      const fd = new FormData();
      fd.append('document_type', docType);
      fd.append('file', file);
      return enrollmentsService.uploadDocument(enrollment!.id, fd);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['my-enrollment'] });
      setEnrollDocFiles((prev) => ({ ...prev, [vars.docType]: null }));
    },
    onError: () => {
      alert('Error al subir el documento. Intenta de nuevo.');
    },
  });

  const createEnrollPaymentMutation = useMutation({
    mutationFn: () =>
      paymentsService.createPayment({
        payment_type: 'inscripcion',
        pre_enrollment: application!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-payment', application!.id] });
    },
    onError: () => {
      alert('Error al generar la ficha de pago. Intenta de nuevo.');
    },
  });

  const uploadEnrollReceiptMutation = useMutation({
    mutationFn: (data: FormData) => paymentsService.uploadReceipt(enrollmentPayment!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-payment', application!.id] });
      setEnrollmentReceiptFile(null);
      setEnrollmentPaymentDate('');
      alert('Comprobante enviado correctamente. Tu pago está siendo revisado por finanzas.');
    },
    onError: () => {
      alert('Error al subir el comprobante. Intenta de nuevo.');
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDownloadSlip = async () => {
    if (!payment) return;
    setIsDownloadingSlip(true);
    try {
      const blob = await paymentsService.downloadSlip(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-pago-${payment.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar la ficha de pago. Intenta de nuevo.');
    } finally {
      setIsDownloadingSlip(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!payment) return;
    setIsDownloadingReceipt(true);
    try {
      const blob = await paymentsService.downloadReceipt(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${payment.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el recibo. Intenta de nuevo.');
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const handleUploadReceipt = () => {
    if (!receiptFile || !paymentDate) return;
    const data = new FormData();
    data.append('receipt_file', receiptFile);
    data.append('payment_date', paymentDate);
    uploadReceiptMutation.mutate(data);
  };

  const handleUploadEnrollDoc = (docType: string) => {
    const file = enrollDocFiles[docType];
    if (!file) return;
    uploadEnrollDocMutation.mutate({ docType, file });
  };

  const handleDownloadEnrollSlip = async () => {
    if (!enrollmentPayment) return;
    setIsDownloadingEnrollSlip(true);
    try {
      const blob = await paymentsService.downloadSlip(enrollmentPayment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-inscripcion-${enrollmentPayment.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar la ficha de pago. Intenta de nuevo.');
    } finally {
      setIsDownloadingEnrollSlip(false);
    }
  };

  const handleDownloadEnrollReceipt = async () => {
    if (!enrollmentPayment) return;
    setIsDownloadingEnrollReceipt(true);
    try {
      const blob = await paymentsService.downloadReceipt(enrollmentPayment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-inscripcion-${enrollmentPayment.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el recibo. Intenta de nuevo.');
    } finally {
      setIsDownloadingEnrollReceipt(false);
    }
  };

  const handleDownloadComprobante = async (enrollmentId: string) => {
    setIsDownloadingComprobante(true);
    try {
      await enrollmentsService.downloadReceipt(enrollmentId);
    } catch {
      alert('Error al descargar el comprobante. Intenta de nuevo.');
    } finally {
      setIsDownloadingComprobante(false);
    }
  };

  const handleDownloadCredential = async (credentialId: string, matricula: string) => {
    setIsDownloadingCredential(true);
    try {
      await credentialsService.downloadCredential(credentialId, matricula);
    } catch {
      alert('Error al descargar la credencial. Intenta de nuevo.');
    } finally {
      setIsDownloadingCredential(false);
    }
  };

  const handleUploadEnrollReceipt = () => {
    if (!enrollmentReceiptFile || !enrollmentPaymentDate) return;
    const data = new FormData();
    data.append('receipt_file', enrollmentReceiptFile);
    data.append('payment_date', enrollmentPaymentDate);
    uploadEnrollReceiptMutation.mutate(data);
  };

  const canSubmitApplication = () => {
    if (!application) return false;
    if (application.status !== 'draft') return false;
    if (!application.documents || application.documents.length === 0) return false;
    return true;
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  // ── No application ─────────────────────────────────────────────────────────

  if (!application) {
    return (
      <div className="w-full space-y-6">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-info-bg)' }}
          >
            <FileText size={32} style={{ color: 'var(--color-info)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Solicitud de Admisión
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Aún no tienes una solicitud activa. Crea una para comenzar tu proceso de admisión.
          </p>

          {!showCreateForm ? (
            <Button size="lg" onClick={() => setShowCreateForm(true)}>
              Crear Nueva Solicitud
            </Button>
          ) : (
            <div className="text-left space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Programa Académico <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecciona un programa...</option>
                  {programs.map((program: any) => (
                    <option key={program.id} value={program.id}>
                      {program.code} — {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Periodo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecciona un periodo...</option>
                  {periods.map((period: any) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  isLoading={createMutation.isPending}
                  disabled={!formData.program || !formData.period}
                >
                  Crear Solicitud
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista principal ───────────────────────────────────────────────────────

  const showPaymentSection = PAYMENT_STATUSES.includes(application.status);
  const showUploadForm =
    payment?.status === 'rejected' ||
    (payment?.status === 'pending' && application.status === 'payment_pending');
  const isRejected = application.status === 'rejected';
  const activeStep = getActiveStep(application, enrollment);

  return (
    <div className="space-y-5 w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Mi Solicitud de Admisión
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {application.program?.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {application.program?.code} · {application.period?.name}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(application.status)}>
          {application.status_display}
        </Badge>
      </div>

      {/* ── Barra de progreso ────────────────────────────────────────────── */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Progreso del proceso
        </p>
        <HorizontalStepper activeStep={activeStep} isRejected={isRejected} />
      </Card>

      {/* ── Alertas ─────────────────────────────────────────────────────── */}
      {application.status === 'draft' && (
        <Callout color="warning" icon={<AlertCircle size={18} />} title="Solicitud en borrador">
          Sube todos los documentos requeridos y luego envía tu solicitud para comenzar el proceso de revisión.
        </Callout>
      )}

      {application.status === 'documents_rejected' && (
        <Callout color="danger" icon={<XCircle size={18} />} title="Documentos rechazados">
          <p>Algunos documentos fueron rechazados. Revísalos en la sección de documentos y vuelve a subirlos.</p>
          {application.notes && (
            <p className="mt-1 font-medium">{application.notes}</p>
          )}
        </Callout>
      )}

      {application.status === 'exam_scheduled' && (
        <Callout color="info" icon={<Calendar size={18} />} title="¡Examen asignado!">
          Tu fecha de examen ha sido confirmada. Consulta los detalles a continuación y preséntate con identificación oficial.
        </Callout>
      )}

      {/* ── Pago de examen ───────────────────────────────────────────────── */}
      {showPaymentSection && (
        <Card>
          <SectionTitle icon={<CreditCard size={17} />} title="Pago de Examen de Admisión" />

          {/* Monto */}
          <div
            className="rounded-xl p-4 mb-5 border"
            style={{ background: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}
          >
            <p className="font-bold text-lg" style={{ color: 'var(--color-info)' }}>$500.00 MXN</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Concepto: Examen de Admisión</p>
          </div>

          {isPaymentLoading && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando información de pago...</p>
          )}

          {!isPaymentLoading && !payment && (
            <div className="text-center py-2">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Genera tu ficha para obtener el número de referencia bancaria y realizar el depósito.
              </p>
              <Button onClick={() => createPaymentMutation.mutate()} isLoading={createPaymentMutation.isPending}>
                Generar Ficha de Pago
              </Button>
            </div>
          )}

          {!isPaymentLoading && payment && (
            <div className="space-y-4">
              {payment.status === 'rejected' && (
                <Callout color="danger" icon={<XCircle size={17} />} title="Comprobante rechazado">
                  {payment.validation_notes && <p>{payment.validation_notes}</p>}
                  <p className="mt-1">Por favor sube un nuevo comprobante.</p>
                </Callout>
              )}

              {/* Número de referencia */}
              <div
                className="rounded-xl p-4 border"
                style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
              >
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  Número de referencia
                </p>
                <p className="text-xl font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
                  {payment.receipt_number}
                </p>
              </div>

              <Button variant="outline" onClick={handleDownloadSlip} isLoading={isDownloadingSlip} disabled={isDownloadingSlip}>
                <Download size={16} className="mr-2" />
                Descargar Ficha de Pago
              </Button>

              {/* Formulario para subir comprobante */}
              {showUploadForm && (
                <div
                  className="rounded-xl p-4 border space-y-3 mt-2"
                  style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
                >
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {payment.status === 'rejected' ? 'Subir nuevo comprobante' : 'Subir comprobante de pago'}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Fecha en que realizaste el pago <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      min={payment.created_at.slice(0, 10)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Archivo del comprobante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PDF, JPG o PNG — máx. 5 MB</p>
                  </div>

                  <Button onClick={handleUploadReceipt} isLoading={uploadReceiptMutation.isPending} disabled={!receiptFile || !paymentDate}>
                    <Upload size={16} className="mr-2" />
                    Enviar Comprobante
                  </Button>
                </div>
              )}

              {payment.status === 'pending' && application.status === 'payment_submitted' && (
                <Callout color="warning" icon={<Clock size={17} />} title="Comprobante en revisión">
                  Tu comprobante fue enviado y está siendo revisado por el equipo de finanzas.
                </Callout>
              )}

              {payment.status === 'validated' && (
                <div className="space-y-3">
                  <Callout color="success" icon={<CheckCircle size={17} />} title="Pago validado">
                    Tu pago fue confirmado por el equipo de finanzas. Ya puedes descargar tu recibo oficial.
                  </Callout>
                  <Button variant="success" onClick={handleDownloadReceipt} isLoading={isDownloadingReceipt} disabled={isDownloadingReceipt}>
                    <Download size={16} className="mr-2" />
                    Descargar Recibo Oficial
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── Examen asignado ──────────────────────────────────────────────── */}
      {application.exam_date && (
        <div
          className="rounded-2xl p-5 border"
          style={{
            background: 'linear-gradient(135deg, var(--color-info-bg) 0%, var(--bg-surface) 100%)',
            borderColor: 'var(--color-info-border)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-info)', color: '#fff' }}
            >
              <Calendar size={18} />
            </div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Examen de Admisión Programado
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="rounded-xl p-3 border"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                Fecha y hora
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {new Date(application.exam_date).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {new Date(application.exam_date).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div
              className="rounded-xl p-3 border"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                Modalidad
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {application.exam_mode === 'presencial' ? '🏫 Presencial' : '💻 En Línea'}
              </p>
            </div>

            {application.exam_location && (
              <div
                className="rounded-xl p-3 border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  Ubicación
                </p>
                <p className="text-sm font-semibold flex items-start gap-1" style={{ color: 'var(--text-primary)' }}>
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  {application.exam_location}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Preséntate con al menos 15 min de anticipación con identificación oficial vigente.
          </p>
        </div>
      )}

      {/* ── Calificación del examen ──────────────────────────────────────── */}
      {application.exam_score !== null && (
        <Card>
          <SectionTitle icon={<Award size={17} />} title="Resultado del Examen" />
          <ScoreCircle score={application.exam_score} />
        </Card>
      )}

      {/* ── Aceptado ────────────────────────────────────────────────────── */}
      {application.status === 'accepted' && !enrollment && (
        <Callout color="success" icon={<CheckCircle size={18} />} title="¡Felicidades, fuiste aceptado!">
          Has superado el proceso de admisión a <strong>{application.program?.name}</strong>. El equipo de Servicios Escolares está procesando tu inscripción formal.
        </Callout>
      )}

      {/* ── Rechazado ────────────────────────────────────────────────────── */}
      {isRejected && (
        <div
          className="rounded-2xl p-8 border text-center"
          style={{ background: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)' }}
        >
          <AlertCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--color-danger)' }} />
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-danger)' }}>
            Solicitud No Aceptada
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Lamentamos informarte que tu solicitud no fue aceptada en este proceso de admisión.
          </p>
          {application.notes && (
            <p className="text-sm mt-3 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {application.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Inscripción formal ───────────────────────────────────────────── */}
      {application.status === 'accepted' && enrollment && (
        <>
          {/* Inscripción completada */}
          {enrollment.status === 'enrolled' && (
            <div
              className="rounded-2xl overflow-hidden border"
              style={{ borderColor: 'var(--color-success-border)' }}
            >
              {/* Banner */}
              <div
                className="px-6 py-8 text-center"
                style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}
              >
                <GraduationCap size={52} className="mx-auto mb-3 text-white opacity-90" />
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  ¡Bienvenido al Sistema Universitario!
                </h2>
                <p className="mt-1.5 text-green-100 text-sm">
                  Tu inscripción ha sido completada exitosamente
                </p>
                <p className="mt-0.5 text-green-200 text-xs">
                  {enrollment.period_name} — {enrollment.program_name ?? application.program?.name}
                </p>
              </div>

              {/* Credenciales institucionales */}
              <div className="p-6" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  Credenciales institucionales
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard
                    icon={<IdCard size={16} />}
                    label="Matrícula"
                    value={enrollment.matricula}
                    mono
                  />
                  <InfoCard
                    icon={<Mail size={16} />}
                    label="Correo institucional"
                    value={
                      enrollment.student?.institutional_email ??
                      `${enrollment.matricula}@universidad.edu.mx`
                    }
                  />
                  {enrollment.group && (
                    <InfoCard icon={<Users size={16} />} label="Grupo" value={enrollment.group} />
                  )}
                  {enrollment.schedule && (
                    <InfoCard icon={<Calendar size={16} />} label="Horario" value={enrollment.schedule} />
                  )}
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="success"
                    onClick={() => handleDownloadComprobante(enrollment.id)}
                    isLoading={isDownloadingComprobante}
                    disabled={isDownloadingComprobante}
                  >
                    <Download size={16} className="mr-2" />
                    Descargar Comprobante de Inscripción
                  </Button>
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Para activar tu correo institucional, acude a Servicios Escolares con identificación oficial.
                </p>
              </div>

              {/* Credencial estudiantil */}
              <div
                className="px-6 py-5 border-t"
                style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Award size={18} style={{ color: 'var(--color-info)' }} />
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Credencial Estudiantil
                  </h3>
                </div>

                {!myCredentialRequest && !activeConvocatoria && (
                  <Callout color="info" icon={<Clock size={16} />} title="Sin convocatoria activa">
                    No hay una convocatoria de credencialización abierta en este momento. Te notificaremos cuando se inicie el proceso.
                  </Callout>
                )}

                {!myCredentialRequest && activeConvocatoria && (
                  <div className="space-y-4">
                    <div
                      className="rounded-xl p-4 border"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                    >
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {activeConvocatoria.title}
                      </p>
                      {activeConvocatoria.description && (
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {activeConvocatoria.description}
                        </p>
                      )}
                      {activeConvocatoria.requirements && (
                        <div
                          className="text-xs rounded-lg p-2 border"
                          style={{
                            background: 'var(--color-warning-bg)',
                            borderColor: 'var(--color-warning-border)',
                            color: 'var(--color-warning)',
                          }}
                        >
                          <span className="font-semibold">Requisitos de fotografía:</span>{' '}
                          {activeConvocatoria.requirements}
                        </div>
                      )}
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        Cierre: {activeConvocatoria.fecha_fin}
                      </p>
                    </div>

                    {/* Verificación de datos */}
                    <div
                      className="rounded-xl p-4 border text-sm space-y-1"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Verifica tus datos antes de solicitar
                      </p>
                      {[
                        { label: 'Nombre', value: `${enrollment.student?.first_name} ${enrollment.student?.last_name}` },
                        { label: 'Matrícula', value: enrollment.matricula },
                        { label: 'Programa', value: enrollment.program?.name },
                        { label: 'Periodo', value: enrollment.period?.name },
                      ].map((row) => (
                        <p key={row.label} style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.label}:</span>{' '}
                          {row.value}
                        </p>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        if (window.confirm('¿Confirmas que tus datos son correctos y deseas solicitar tu credencial?')) {
                          requestCredentialMutation.mutate(activeConvocatoria.id);
                        }
                      }}
                      isLoading={requestCredentialMutation.isPending}
                    >
                      <Award size={16} className="mr-2" />
                      Solicitar Credencial
                    </Button>
                  </div>
                )}

                {myCredentialRequest?.status === 'pendiente' && (
                  <Callout color="warning" icon={<Clock size={16} />} title="Solicitud en revisión">
                    Tu solicitud de credencial está siendo procesada. Te notificaremos por correo cuando esté lista.
                  </Callout>
                )}

                {myCredentialRequest?.status === 'rechazada' && (
                  <Callout color="danger" icon={<AlertCircle size={16} />} title="Solicitud rechazada">
                    {myCredentialRequest.rejection_reason && (
                      <p>{myCredentialRequest.rejection_reason}</p>
                    )}
                  </Callout>
                )}

                {myCredentialRequest?.status === 'generada' && (
                  <div className="space-y-3">
                    {/* Banner verde de credencial lista */}
                    <div
                      className="rounded-2xl p-5 border flex items-center gap-4 flex-wrap"
                      style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)' }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--color-success)', color: '#fff' }}
                      >
                        <Award size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base" style={{ color: 'var(--color-success)' }}>
                          ¡Tu credencial estudiantil está lista!
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Descárgala en formato PDF para tenerla disponible en todo momento.
                        </p>
                      </div>
                      {myCredentialRequest.credential_id && (
                        <Button
                          variant="success"
                          onClick={() =>
                            handleDownloadCredential(
                              myCredentialRequest.credential_id!,
                              myCredentialRequest.matricula,
                            )
                          }
                          isLoading={isDownloadingCredential}
                          disabled={isDownloadingCredential}
                        >
                          <Download size={16} className="mr-2" />
                          Descargar Credencial
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documentos de inscripción */}
          {(enrollment.status === 'pending_docs' || enrollment.status === 'pending_payment') && (
            <Card>
              <SectionTitle icon={<BookOpen size={17} />} title="Documentos de Inscripción" />

              {enrollment.status === 'pending_payment' ? (
                <Callout color="success" icon={<CheckCircle size={16} />} title="Documentos aprobados">
                  Todos tus documentos han sido aprobados. Procede al pago de inscripción.
                </Callout>
              ) : (
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Sube los siguientes documentos para continuar con tu inscripción formal:
                </p>
              )}

              <div className="space-y-3 mt-4">
                {ENROLLMENT_DOC_TYPES.map(({ key, label }) => {
                  const uploaded = enrollment.documents?.find((d) => d.document_type === key);
                  const isPlaceholder = uploaded && !uploaded.file_name;
                  const canUpload = !uploaded || isPlaceholder || uploaded.status === 'rejected';

                  const statusIcon =
                    uploaded?.status === 'approved' ? (
                      <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                    ) : uploaded?.status === 'rejected' ? (
                      <XCircle size={18} style={{ color: 'var(--color-danger)' }} />
                    ) : uploaded ? (
                      <Clock size={18} style={{ color: 'var(--color-warning)' }} />
                    ) : null;

                  return (
                    <div
                      key={key}
                      className="rounded-xl border p-4"
                      style={{
                        background: 'var(--bg-surface-2)',
                        borderColor:
                          uploaded?.status === 'approved'
                            ? 'var(--color-success-border)'
                            : uploaded?.status === 'rejected'
                            ? 'var(--color-danger-border)'
                            : 'var(--border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {statusIcon ?? (
                            <FileText size={18} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            {label}
                          </p>
                        </div>
                        {uploaded && (
                          <Badge
                            variant={
                              uploaded.status === 'approved'
                                ? 'success'
                                : uploaded.status === 'rejected'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {uploaded.status_display}
                          </Badge>
                        )}
                      </div>

                      {uploaded?.reviewer_notes && uploaded.status === 'rejected' && (
                        <div
                          className="rounded-lg p-3 border mb-3 text-xs"
                          style={{
                            background: 'var(--color-danger-bg)',
                            borderColor: 'var(--color-danger-border)',
                            color: 'var(--color-danger)',
                          }}
                        >
                          <span className="font-semibold">Motivo de rechazo:</span>{' '}
                          {uploaded.reviewer_notes}
                        </div>
                      )}

                      {uploaded && !isPlaceholder && uploaded.status !== 'rejected' ? (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Archivo: {uploaded.file_name}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                              setEnrollDocFiles((prev) => ({
                                ...prev,
                                [key]: e.target.files?.[0] ?? null,
                              }))
                            }
                            disabled={!canUpload}
                            className="flex-1 text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUploadEnrollDoc(key)}
                            disabled={!enrollDocFiles[key] || uploadEnrollDocMutation.isPending}
                            isLoading={
                              uploadEnrollDocMutation.isPending &&
                              uploadEnrollDocMutation.variables?.docType === key
                            }
                          >
                            <Upload size={13} className="mr-1" />
                            Subir
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Pago de inscripción */}
          {enrollment.status === 'pending_payment' && (
            <Card>
              <SectionTitle icon={<CreditCard size={17} />} title="Pago de Inscripción" />

              <div
                className="rounded-xl p-4 border mb-5"
                style={{ background: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--color-info)' }}>
                  Concepto: Pago de Inscripción
                </p>
                {enrollment.group && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Grupo: {enrollment.group} · Horario: {enrollment.schedule}
                  </p>
                )}
              </div>

              {isEnrollPaymentLoading && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando información de pago...</p>
              )}

              {!isEnrollPaymentLoading && !enrollmentPayment && (
                <div className="text-center py-2">
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Genera tu ficha de pago para obtener el número de referencia bancaria.
                  </p>
                  <Button onClick={() => createEnrollPaymentMutation.mutate()} isLoading={createEnrollPaymentMutation.isPending}>
                    Generar Ficha de Pago
                  </Button>
                </div>
              )}

              {!isEnrollPaymentLoading && enrollmentPayment && (
                <div className="space-y-4">
                  {enrollmentPayment.status === 'rejected' && (
                    <Callout color="danger" icon={<XCircle size={17} />} title="Comprobante rechazado">
                      {enrollmentPayment.validation_notes && <p>{enrollmentPayment.validation_notes}</p>}
                      <p className="mt-1">Por favor sube un nuevo comprobante.</p>
                    </Callout>
                  )}

                  <div
                    className="rounded-xl p-4 border"
                    style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                      Número de referencia
                    </p>
                    <p className="text-xl font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
                      {enrollmentPayment.receipt_number}
                    </p>
                  </div>

                  <Button variant="outline" onClick={handleDownloadEnrollSlip} isLoading={isDownloadingEnrollSlip} disabled={isDownloadingEnrollSlip}>
                    <Download size={16} className="mr-2" />
                    Descargar Ficha de Pago
                  </Button>

                  {(enrollmentPayment.status === 'rejected' ||
                    (enrollmentPayment.status === 'pending' && enrollment.status === 'pending_payment')) && (
                    <div
                      className="rounded-xl p-4 border space-y-3"
                      style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border)' }}
                    >
                      <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {enrollmentPayment.status === 'rejected' ? 'Subir nuevo comprobante' : 'Subir comprobante de pago'}
                      </h4>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Fecha en que realizaste el pago <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={enrollmentPaymentDate}
                          onChange={(e) => setEnrollmentPaymentDate(e.target.value)}
                          min={enrollmentPayment.created_at.slice(0, 10)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Archivo del comprobante <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setEnrollmentReceiptFile(e.target.files?.[0] ?? null)}
                          className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PDF, JPG o PNG — máx. 5 MB</p>
                      </div>

                      <Button
                        onClick={handleUploadEnrollReceipt}
                        isLoading={uploadEnrollReceiptMutation.isPending}
                        disabled={!enrollmentReceiptFile || !enrollmentPaymentDate}
                      >
                        <Upload size={16} className="mr-2" />
                        Enviar Comprobante
                      </Button>
                    </div>
                  )}

                  {enrollmentPayment.status === 'pending' &&
                    enrollment.status === 'pending_payment' &&
                    enrollmentPayment.receipt_file && (
                    <Callout color="warning" icon={<Clock size={17} />} title="Comprobante en revisión">
                      Tu comprobante fue enviado y está siendo revisado por el equipo de finanzas.
                    </Callout>
                  )}

                  {enrollmentPayment.status === 'validated' && (
                    <div className="space-y-3">
                      <Callout color="success" icon={<CheckCircle size={17} />} title="Pago validado">
                        Tu pago fue confirmado. ¡Tu inscripción está en proceso de finalización!
                      </Callout>
                      <Button variant="success" onClick={handleDownloadEnrollReceipt} isLoading={isDownloadingEnrollReceipt} disabled={isDownloadingEnrollReceipt}>
                        <Download size={16} className="mr-2" />
                        Descargar Recibo Oficial
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── Documentos (pre-inscripción) ─────────────────────────────────── */}
      <Card>
        <SectionTitle icon={<FileText size={17} />} title="Documentos de Solicitud" />
        <DocumentUploader application={application} />
      </Card>

      {/* ── Enviar solicitud ─────────────────────────────────────────────── */}
      {application.status === 'draft' && (
        <div
          className="rounded-2xl p-6 border text-center"
          style={{ background: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}
        >
          <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-info)' }}>
            ¿Listo para enviar tu solicitud?
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Asegúrate de haber subido todos los documentos requeridos antes de enviar.
          </p>
          <Button
            size="lg"
            onClick={() => {
              if (window.confirm('¿Enviar solicitud? No podrás modificarla después.')) {
                submitMutation.mutate();
              }
            }}
            isLoading={submitMutation.isPending}
            disabled={!canSubmitApplication()}
          >
            <Send size={18} className="mr-2" />
            Enviar Solicitud
          </Button>
          {!canSubmitApplication() && (
            <p className="text-xs mt-3" style={{ color: 'var(--color-danger)' }}>
              Debes subir al menos un documento antes de enviar.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
