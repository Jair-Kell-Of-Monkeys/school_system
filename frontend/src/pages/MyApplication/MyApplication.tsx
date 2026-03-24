import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { StatusTimeline } from '@/components/molecules/StatusTimeline/StatusTimeline';
import { DocumentUploader } from '@/components/organisms/DocumentUploader/DocumentUploader';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { paymentsService } from '@/services/payments/paymentsService';
import { enrollmentsService } from '@/services/enrollments/enrollmentsService';
import { credentialsService } from '@/services/credentials/credentialsService';
import type { TimelineStep } from '@/components/molecules/StatusTimeline/StatusTimeline';
import type { EnrollmentDetail } from '@/types';
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
} from 'lucide-react';

// Documentos requeridos para inscripción formal (exactamente 2)
const ENROLLMENT_DOC_TYPES = [
  { key: 'numero_seguridad_social', label: 'Número de Seguridad Social' },
  { key: 'certificado_bachillerato', label: 'Certificado de Bachillerato Original' },
] as const;

const PAYMENT_STATUSES = ['payment_pending', 'payment_submitted', 'payment_validated'];
const ENROLLMENT_PAYMENT_STATUSES = ['payment_pending', 'payment_submitted', 'payment_validated'];

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

  // Solo carga el pago cuando la solicitud está en etapa de pago
  const { data: payment, isLoading: isPaymentLoading } = useQuery({
    queryKey: ['my-payment', application?.id],
    queryFn: () => paymentsService.getPaymentForPreEnrollment(application!.id),
    enabled: !!application && PAYMENT_STATUSES.includes(application.status),
  });

  // Carga la inscripción formal cuando la solicitud fue aceptada
  const { data: myEnrollments } = useQuery({
    queryKey: ['my-enrollment'],
    queryFn: enrollmentsService.getMyEnrollments,
    enabled: !!application && application.status === 'accepted',
  });
  const enrollment: EnrollmentDetail | undefined = myEnrollments?.[0];

  // Pago de inscripción (cuando enrollment está en pending_payment)
  const { data: enrollmentPayment, isLoading: isEnrollPaymentLoading } = useQuery({
    queryKey: ['enrollment-payment', application?.id],
    queryFn: () => paymentsService.getPaymentForPreEnrollment(application!.id),
    enabled: !!enrollment && ENROLLMENT_PAYMENT_STATUSES.includes(enrollment.status),
  });

  // Credencial — solo cuando la inscripción está completada (enrolled)
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
      alert(
        'Solicitud enviada correctamente. El equipo de admisiones revisará tus documentos.'
      );
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

  // ── Timeline ─────────────────────────────────────────────────────────────

  const getTimelineSteps = (): TimelineStep[] => {
    if (!application) return [];

    const appStatus = application.status;
    const docs = application.documents ?? [];

    const allDocsApproved = docs.length > 0 && docs.every((d) => d.status === 'approved');
    const anyDocRejected  = docs.some((d) => d.status === 'rejected');

    const inReview  = ['submitted', 'under_review', 'documents_rejected'].includes(appStatus);
    const pastReview = [
      'documents_approved',
      'payment_pending',
      'payment_submitted',
      'payment_validated',
      'exam_scheduled',
      'exam_completed',
      'accepted',
      'rejected',
    ].includes(appStatus);

    let reviewStatus: TimelineStep['status'];
    if (pastReview) {
      reviewStatus = 'completed';
    } else if (inReview) {
      if (allDocsApproved)     reviewStatus = 'completed';
      else if (anyDocRejected) reviewStatus = 'warning';
      else                     reviewStatus = 'processing';
    } else {
      reviewStatus = 'pending';
    }

    const docsApprovedStatus: TimelineStep['status'] =
      allDocsApproved || pastReview ? 'completed' : 'pending';

    let paymentStatus: TimelineStep['status'];
    if (
      ['payment_validated', 'exam_scheduled', 'exam_completed', 'accepted', 'rejected'].includes(
        appStatus
      )
    ) {
      paymentStatus = 'completed';
    } else if (PAYMENT_STATUSES.includes(appStatus)) {
      paymentStatus = 'current';
    } else {
      paymentStatus = 'pending';
    }

    let examStatus: TimelineStep['status'];
    if (['exam_completed', 'accepted', 'rejected'].includes(appStatus)) {
      examStatus = 'completed';
    } else if (appStatus === 'exam_scheduled') {
      examStatus = 'current';
    } else {
      examStatus = 'pending';
    }

    let resultStatus: TimelineStep['status'];
    if (appStatus === 'accepted')      resultStatus = 'completed';
    else if (appStatus === 'rejected') resultStatus = 'rejected';
    else                               resultStatus = 'pending';

    return [
      { id: 'draft',              label: 'Borrador',             status: 'completed' },
      { id: 'submitted',          label: 'Enviado',              status: application.submitted_at ? 'completed' : 'pending' },
      { id: 'under_review',       label: 'En Revisión',          status: reviewStatus },
      { id: 'documents_approved', label: 'Documentos Aprobados', status: docsApprovedStatus },
      { id: 'payment',            label: 'Pago Validado',        status: paymentStatus },
      { id: 'exam',               label: 'Examen',               status: examStatus },
      { id: 'result',             label: 'Resultado',            status: resultStatus },
    ];
  };

  const canSubmitApplication = () => {
    if (!application) return false;
    if (application.status !== 'draft') return false;
    if (!application.documents || application.documents.length === 0) return false;
    return true;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <FileText className="mx-auto text-primary-600 mb-4" size={64} />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Solicitud de Admisión</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Aún no tienes una solicitud activa. Crea una para comenzar tu proceso de admisión.
          </p>
        </div>

        {!showCreateForm ? (
          <Card className="text-center">
            <Button size="lg" onClick={() => setShowCreateForm(true)}>
              Crear Nueva Solicitud
            </Button>
          </Card>
        ) : (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Nueva Solicitud de Admisión
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Programa Académico
                </label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Selecciona un programa...</option>
                  {programs.map((program: any) => (
                    <option key={program.id} value={program.id}>
                      {program.code} - {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Periodo
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Selecciona un periodo...</option>
                  {periods.map((period: any) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
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
          </Card>
        )}
      </div>
    );
  }

  // ── Vista principal ───────────────────────────────────────────────────────

  // ¿Debe mostrarse la sección de pago?
  const showPaymentSection = PAYMENT_STATUSES.includes(application.status);
  // ¿El formulario de carga debe aparecer?
  // - Pago rechazado (siempre permitir reintentar), o
  // - Pago pendiente pero comprobante aún no enviado (application todavía en payment_pending)
  const showUploadForm =
    payment?.status === 'rejected' ||
    (payment?.status === 'pending' && application.status === 'payment_pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mi Solicitud de Admisión</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Programa: {application.program?.code} - {application.program?.name}
        </p>
      </div>

      {/* Estado actual */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Estado Actual</h2>
          <Badge
            variant={
              application.status === 'accepted'
                ? 'success'
                : application.status === 'rejected'
                ? 'danger'
                : 'info'
            }
          >
            {application.status_display}
          </Badge>
        </div>
        <StatusTimeline steps={getTimelineSteps()} />
      </Card>

      {/* Alertas importantes */}
      {application.status === 'documents_rejected' && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start">
            <AlertCircle className="text-red-600 mr-3 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">Documentos Rechazados</h3>
              <p className="text-sm text-red-700 mt-1">
                Algunos de tus documentos fueron rechazados. Por favor revísalos y vuelve a
                subirlos.
              </p>
              {application.notes && (
                <p className="text-sm text-red-700 mt-2">
                  <span className="font-medium">Notas:</span> {application.notes}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {application.status === 'draft' && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 mr-3 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-900">Solicitud en Borrador</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Sube todos los documentos requeridos y envía tu solicitud para comenzar el
                proceso de revisión.
              </p>
            </div>
          </div>
        </Card>
      )}

      {application.status === 'exam_scheduled' && (
        <Card className="border-l-4 border-blue-500 bg-blue-50">
          <div className="flex items-start">
            <CheckCircle className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-blue-900">¡Examen Asignado!</h3>
              <p className="text-sm text-blue-700 mt-1">
                Tu fecha de examen ha sido confirmada. Consulta los detalles a continuación y
                preséntate con identificación oficial.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Sección de Pago ─────────────────────────────────────────────── */}
      {showPaymentSection && (
        <Card>
          <div className="flex items-center mb-5">
            <CreditCard className="text-primary-600 mr-3 flex-shrink-0" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pago de Examen de Admisión</h2>
          </div>

          {/* Monto */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
            <p className="text-blue-900 font-medium">$500.00 MXN</p>
            <p className="text-sm text-blue-700 mt-0.5">Concepto: Examen de Admisión</p>
          </div>

          {isPaymentLoading && (
            <p className="text-sm text-gray-500">Cargando información de pago...</p>
          )}

          {/* Sin pago creado */}
          {!isPaymentLoading && !payment && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Genera tu ficha para obtener el número de referencia bancaria y realizar el
                depósito.
              </p>
              <Button
                onClick={() => createPaymentMutation.mutate()}
                isLoading={createPaymentMutation.isPending}
              >
                Generar Ficha de Pago
              </Button>
            </div>
          )}

          {/* Pago existe */}
          {!isPaymentLoading && payment && (
            <div className="space-y-4">

              {/* Aviso de rechazo */}
              {payment.status === 'rejected' && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-medium text-red-900">Comprobante rechazado</p>
                    {payment.validation_notes && (
                      <p className="text-sm text-red-700 mt-1">{payment.validation_notes}</p>
                    )}
                    <p className="text-sm text-red-600 mt-1">
                      Por favor sube un nuevo comprobante.
                    </p>
                  </div>
                </div>
              )}

              {/* Número de referencia */}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de referencia</p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider">
                  {payment.receipt_number}
                </p>
              </div>

              {/* Descargar ficha */}
              <Button
                variant="outline"
                onClick={handleDownloadSlip}
                isLoading={isDownloadingSlip}
                disabled={isDownloadingSlip}
              >
                <Download size={18} className="mr-2" />
                Descargar Ficha de Pago
              </Button>

              {/* Formulario para subir comprobante */}
              {showUploadForm && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {payment.status === 'rejected'
                      ? 'Subir nuevo comprobante'
                      : 'Subir comprobante de pago'}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha en que realizaste el pago{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      min={payment.created_at.slice(0, 10)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Archivo del comprobante{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, JPG o PNG — máx. 5 MB</p>
                  </div>

                  <Button
                    onClick={handleUploadReceipt}
                    isLoading={uploadReceiptMutation.isPending}
                    disabled={!receiptFile || !paymentDate}
                  >
                    <Upload size={18} className="mr-2" />
                    Enviar Comprobante
                  </Button>
                </div>
              )}

              {/* Comprobante en revisión */}
              {payment.status === 'pending' && application.status === 'payment_submitted' && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-1">
                  <CheckCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-yellow-800">
                    Tu comprobante fue enviado y está siendo revisado por el equipo de
                    finanzas.
                  </p>
                </div>
              )}

              {/* Pago validado */}
              {payment.status === 'validated' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-medium text-green-900">Pago validado</p>
                      <p className="text-sm text-green-700 mt-0.5">
                        Tu pago fue confirmado por el equipo de finanzas. Ya puedes descargar
                        tu recibo oficial.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="success"
                    onClick={handleDownloadReceipt}
                    isLoading={isDownloadingReceipt}
                    disabled={isDownloadingReceipt}
                  >
                    <Download size={18} className="mr-2" />
                    Descargar Recibo Oficial
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Información del examen */}
      {application.exam_date && (
        <Card>
          <div className="flex items-start mb-4">
            <Calendar className="text-primary-600 mr-3 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Examen de Admisión Programado
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Fecha:</span>{' '}
                  {new Date(application.exam_date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Modalidad:</span>{' '}
                  {application.exam_mode === 'presencial' ? 'Presencial' : 'En Línea'}
                </p>
                {application.exam_location && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Ubicación:</span>{' '}
                    {application.exam_location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Calificación del examen */}
      {application.exam_score !== null && (
        <Card className="border-l-4 border-green-500">
          <div className="flex items-start">
            <CheckCircle className="text-green-600 mr-3 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Calificación del Examen</h3>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {application.exam_score}/100
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Resultado final */}
      {application.status === 'accepted' && (
        <Card className="border-l-4 border-green-500 bg-green-50">
          <div className="text-center py-6">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-green-900">
              ¡Felicidades! Has sido aceptado
            </h2>
            <p className="text-green-700 mt-2">Bienvenido a {application.program?.name}</p>
          </div>
        </Card>
      )}

      {/* ── Sección de Inscripción Formal ───────────────────────────────── */}
      {application.status === 'accepted' && enrollment && (
        <>
          {/* Inscripción completada — pantalla de bienvenida institucional */}
          {enrollment.status === 'enrolled' && (
            <div className="space-y-0 rounded-xl overflow-hidden shadow-lg border border-green-300">
              {/* Banner superior */}
              <div className="bg-gradient-to-r from-green-700 to-green-500 px-8 py-8 text-white text-center">
                <GraduationCap className="mx-auto mb-3" size={56} />
                <h2 className="text-3xl font-bold tracking-tight">
                  ¡Bienvenido al Sistema Universitario!
                </h2>
                <p className="mt-2 text-green-100 text-lg">
                  Tu inscripción ha sido completada exitosamente.
                </p>
                <p className="mt-1 text-green-200 text-sm">
                  {enrollment.period?.name ?? ''} — {enrollment.program?.name ?? application.program?.name}
                </p>
              </div>

              {/* Tarjeta de credenciales */}
              <div className="bg-white dark:bg-gray-800 px-8 py-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Credenciales institucionales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Matrícula</p>
                    <p className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100 tracking-widest">
                      {enrollment.matricula}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Correo institucional</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                      {enrollment.student?.institutional_email ?? `${enrollment.matricula}@universidad.edu.mx`}
                    </p>
                  </div>
                  {enrollment.group && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Grupo</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{enrollment.group}</p>
                    </div>
                  )}
                  {enrollment.schedule && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{enrollment.schedule}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    variant="success"
                    onClick={() => handleDownloadComprobante(enrollment.id)}
                    isLoading={isDownloadingComprobante}
                    disabled={isDownloadingComprobante}
                  >
                    <Download size={18} className="mr-2" />
                    Descargar Comprobante de Inscripción
                  </Button>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  Conserva tu comprobante. Para activar tu correo institucional, acude a Servicios Escolares con identificación oficial.
                </p>
              </div>

              {/* ── Sección Credencial Estudiantil ─────────────────────── */}
              <div className="bg-blue-50 border-t border-blue-100 px-8 py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="text-blue-600" size={22} />
                  <h3 className="text-base font-semibold text-blue-900">
                    Credencial Estudiantil
                  </h3>
                </div>

                {/* Sin convocatoria activa y sin solicitud */}
                {!myCredentialRequest && !activeConvocatoria && (
                  <div className="flex items-start gap-3 p-3 bg-white border border-blue-200 rounded-lg">
                    <Clock className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-sm text-blue-700">
                      No hay una convocatoria de credencialización activa en este momento.
                      Te notificaremos cuando se abra el proceso.
                    </p>
                  </div>
                )}

                {/* Hay convocatoria activa y el alumno no ha solicitado */}
                {!myCredentialRequest && activeConvocatoria && (
                  <div className="space-y-4">
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {activeConvocatoria.title}
                      </p>
                      {activeConvocatoria.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {activeConvocatoria.description}
                        </p>
                      )}
                      {activeConvocatoria.requirements && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-2">
                          <span className="font-medium">Requisitos de fotografía:</span>{' '}
                          {activeConvocatoria.requirements}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Cierre: {activeConvocatoria.fecha_fin}
                      </p>
                    </div>

                    <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Verifica tus datos antes de solicitar
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Nombre:</span>{' '}
                        {enrollment.student?.first_name} {enrollment.student?.last_name}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Matrícula:</span> {enrollment.matricula}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Programa:</span>{' '}
                        {enrollment.program?.name}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Periodo:</span>{' '}
                        {enrollment.period?.name}
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        if (
                          window.confirm(
                            '¿Confirmas que tus datos son correctos y deseas solicitar tu credencial?'
                          )
                        ) {
                          requestCredentialMutation.mutate(activeConvocatoria.id);
                        }
                      }}
                      isLoading={requestCredentialMutation.isPending}
                    >
                      <Award size={18} className="mr-2" />
                      Solicitar Credencial
                    </Button>
                  </div>
                )}

                {/* Solicitud enviada - pendiente */}
                {myCredentialRequest?.status === 'pendiente' && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Solicitud en revisión
                      </p>
                      <p className="text-sm text-yellow-700 mt-0.5">
                        Tu solicitud de credencial está siendo revisada. Te notificaremos
                        por correo cuando sea procesada.
                      </p>
                    </div>
                  </div>
                )}

                {/* Rechazada */}
                {myCredentialRequest?.status === 'rechazada' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-sm font-medium text-red-800">Solicitud rechazada</p>
                        {myCredentialRequest.rejection_reason && (
                          <p className="text-sm text-red-700 mt-0.5">
                            {myCredentialRequest.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generada - disponible para descargar */}
                {myCredentialRequest?.status === 'generada' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-medium text-green-900">
                          ¡Tu credencial está lista!
                        </p>
                        <p className="text-sm text-green-700 mt-0.5">
                          Descarga tu credencial estudiantil en formato PDF.
                        </p>
                      </div>
                    </div>
                    {myCredentialRequest.credential_id && (
                      <Button
                        variant="success"
                        onClick={() =>
                          handleDownloadCredential(
                            myCredentialRequest.credential_id!,
                            myCredentialRequest.matricula
                          )
                        }
                        isLoading={isDownloadingCredential}
                        disabled={isDownloadingCredential}
                      >
                        <Download size={18} className="mr-2" />
                        Descargar Credencial
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documentos de inscripción */}
          {(enrollment.status === 'pending_docs' || enrollment.status === 'pending_payment') && (
            <Card>
              <div className="flex items-center mb-5">
                <BookOpen className="text-primary-600 mr-3 flex-shrink-0" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Documentos de Inscripción
                </h2>
              </div>

              {enrollment.status === 'pending_payment' ? (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-green-800">
                    Todos tus documentos han sido aprobados. Procede al pago de inscripción.
                  </p>
                </div>
              ) : enrollment.status === 'pending_docs' ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Sube los siguientes documentos para continuar con tu inscripción:
                </p>
              ) : null}

              <div className="space-y-4">
                {ENROLLMENT_DOC_TYPES.map(({ key, label }) => {
                  const uploaded = enrollment.documents?.find((d) => d.document_type === key);
                  // Placeholder: record exists but no file yet (file_name is empty)
                  const isPlaceholder = uploaded && !uploaded.file_name;
                  const canUpload = !uploaded || isPlaceholder || uploaded.status === 'rejected';

                  return (
                    <div
                      key={key}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
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
                        <p className="text-sm text-red-600 mb-2">
                          <span className="font-medium">Motivo de rechazo:</span>{' '}
                          {uploaded.reviewer_notes}
                        </p>
                      )}

                      {uploaded && !isPlaceholder && uploaded.status !== 'rejected' ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Archivo: {uploaded.file_name}
                        </p>
                      ) : (
                        <div className="flex items-center gap-3 mt-2">
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
                            className="flex-1 text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
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
                            <Upload size={14} className="mr-1" />
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
              <div className="flex items-center mb-5">
                <CreditCard className="text-primary-600 mr-3 flex-shrink-0" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Pago de Inscripción
                </h2>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <p className="text-blue-900 font-medium">Concepto: Pago de Inscripción</p>
                {enrollment.group && (
                  <p className="text-sm text-blue-700 mt-1">
                    Grupo: {enrollment.group} | Horario: {enrollment.schedule}
                  </p>
                )}
              </div>

              {isEnrollPaymentLoading && (
                <p className="text-sm text-gray-500">Cargando información de pago...</p>
              )}

              {!isEnrollPaymentLoading && !enrollmentPayment && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Genera tu ficha de pago para obtener el número de referencia bancaria.
                  </p>
                  <Button
                    onClick={() => createEnrollPaymentMutation.mutate()}
                    isLoading={createEnrollPaymentMutation.isPending}
                  >
                    Generar Ficha de Pago
                  </Button>
                </div>
              )}

              {!isEnrollPaymentLoading && enrollmentPayment && (
                <div className="space-y-4">
                  {enrollmentPayment.status === 'rejected' && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-medium text-red-900">Comprobante rechazado</p>
                        {enrollmentPayment.validation_notes && (
                          <p className="text-sm text-red-700 mt-1">
                            {enrollmentPayment.validation_notes}
                          </p>
                        )}
                        <p className="text-sm text-red-600 mt-1">
                          Por favor sube un nuevo comprobante.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de referencia</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider">
                      {enrollmentPayment.receipt_number}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleDownloadEnrollSlip}
                    isLoading={isDownloadingEnrollSlip}
                    disabled={isDownloadingEnrollSlip}
                  >
                    <Download size={18} className="mr-2" />
                    Descargar Ficha de Pago
                  </Button>

                  {(enrollmentPayment.status === 'rejected' ||
                    (enrollmentPayment.status === 'pending' &&
                      enrollment.status === 'pending_payment')) && (
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {enrollmentPayment.status === 'rejected'
                          ? 'Subir nuevo comprobante'
                          : 'Subir comprobante de pago'}
                      </h4>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha en que realizaste el pago{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={enrollmentPaymentDate}
                          onChange={(e) => setEnrollmentPaymentDate(e.target.value)}
                          min={enrollmentPayment.created_at.slice(0, 10)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Archivo del comprobante{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            setEnrollmentReceiptFile(e.target.files?.[0] ?? null)
                          }
                          className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          PDF, JPG o PNG — máx. 5 MB
                        </p>
                      </div>

                      <Button
                        onClick={handleUploadEnrollReceipt}
                        isLoading={uploadEnrollReceiptMutation.isPending}
                        disabled={!enrollmentReceiptFile || !enrollmentPaymentDate}
                      >
                        <Upload size={18} className="mr-2" />
                        Enviar Comprobante
                      </Button>
                    </div>
                  )}

                  {enrollmentPayment.status === 'pending' &&
                    enrollment.status === 'pending_payment' &&
                    enrollmentPayment.receipt_file && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <CheckCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-yellow-800">
                        Tu comprobante fue enviado y está siendo revisado por el equipo de
                        finanzas.
                      </p>
                    </div>
                  )}

                  {enrollmentPayment.status === 'validated' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="font-medium text-green-900">Pago validado</p>
                          <p className="text-sm text-green-700 mt-0.5">
                            Tu pago fue confirmado. ¡Tu inscripción está en proceso de finalización!
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="success"
                        onClick={handleDownloadEnrollReceipt}
                        isLoading={isDownloadingEnrollReceipt}
                        disabled={isDownloadingEnrollReceipt}
                      >
                        <Download size={18} className="mr-2" />
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

      {application.status === 'rejected' && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <div className="text-center py-6">
            <AlertCircle className="mx-auto text-red-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-red-900">Solicitud No Aceptada</h2>
            <p className="text-red-700 mt-2">
              Lamentamos informarte que tu solicitud no fue aceptada en este proceso.
            </p>
            {application.notes && (
              <p className="text-sm text-red-700 mt-4 max-w-2xl mx-auto">
                {application.notes}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Documentos */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Documentos</h2>
        <DocumentUploader application={application} />
      </Card>

      {/* Botón de envío */}
      {application.status === 'draft' && (
        <Card className="bg-primary-50">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ¿Listo para enviar tu solicitud?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
              <Send size={20} className="mr-2" />
              Enviar Solicitud
            </Button>
            {!canSubmitApplication() && (
              <p className="text-sm text-red-600 mt-2">
                Debes subir al menos un documento antes de enviar
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
