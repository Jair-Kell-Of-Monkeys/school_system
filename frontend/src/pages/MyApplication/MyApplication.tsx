import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { StatusTimeline } from '@/components/molecules/StatusTimeline/StatusTimeline';
import { DocumentUploader } from '@/components/organisms/DocumentUploader/DocumentUploader';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { paymentsService } from '@/services/payments/paymentsService';
import type { TimelineStep } from '@/components/molecules/StatusTimeline/StatusTimeline';
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
} from 'lucide-react';

const PAYMENT_STATUSES = ['payment_pending', 'payment_submitted', 'payment_validated'];

export const MyApplication = () => {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ program: '', period: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [isDownloadingSlip, setIsDownloadingSlip] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

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

    const examStatus: TimelineStep['status'] = [
      'exam_scheduled', 'exam_completed', 'accepted', 'rejected',
    ].includes(appStatus)
      ? 'completed'
      : 'pending';

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
          <h1 className="text-3xl font-bold text-gray-900">Solicitud de Admisión</h1>
          <p className="text-gray-600 mt-2">
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Nueva Solicitud de Admisión
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Programa Académico
                </label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        <h1 className="text-3xl font-bold text-gray-900">Mi Solicitud de Admisión</h1>
        <p className="text-gray-600 mt-1">
          Programa: {application.program?.code} - {application.program?.name}
        </p>
      </div>

      {/* Estado actual */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Estado Actual</h2>
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

      {/* ── Sección de Pago ─────────────────────────────────────────────── */}
      {showPaymentSection && (
        <Card>
          <div className="flex items-center mb-5">
            <CreditCard className="text-primary-600 mr-3 flex-shrink-0" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Pago de Examen de Admisión</h2>
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
              <p className="text-sm text-gray-600 mb-4">
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
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Número de referencia</p>
                <p className="text-lg font-mono font-bold text-gray-900 tracking-wider">
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
                  <h4 className="font-medium text-gray-900">
                    {payment.status === 'rejected'
                      ? 'Subir nuevo comprobante'
                      : 'Subir comprobante de pago'}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha en que realizaste el pago{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      min={payment.created_at.slice(0, 10)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Archivo del comprobante{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG o PNG — máx. 5 MB</p>
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
              <h3 className="text-lg font-semibold text-gray-900">
                Examen de Admisión Programado
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-gray-700">
                  <span className="font-medium">Fecha:</span>{' '}
                  {new Date(application.exam_date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Modalidad:</span>{' '}
                  {application.exam_mode === 'presencial' ? 'Presencial' : 'En Línea'}
                </p>
                {application.exam_location && (
                  <p className="text-gray-700">
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
              <h3 className="text-lg font-semibold text-gray-900">Calificación del Examen</h3>
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documentos</h2>
        <DocumentUploader application={application} />
      </Card>

      {/* Botón de envío */}
      {application.status === 'draft' && (
        <Card className="bg-primary-50">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-2">
              ¿Listo para enviar tu solicitud?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
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
