import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input } from '@/components/atoms/Input/Input';
import type { PreEnrollmentDetail } from '@/types';
import { preEnrollmentsService } from '@/services/preEnrollments/preEnrollmentsService';
import { useAuthStore } from '@/store/authStore';
import {
  X,
  User,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';

interface PreEnrollmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preEnrollment: PreEnrollmentDetail | null;
}

export const PreEnrollmentDetailsModal = ({
  isOpen,
  onClose,
  preEnrollment,
}: PreEnrollmentDetailsModalProps) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'exam'>('info');
  const [notes, setNotes] = useState('');
  const [examData, setExamData] = useState({
    exam_date: '',
    exam_mode: 'presencial' as 'presencial' | 'en_linea',
    exam_location: '',
  });
  const [examScore, setExamScore] = useState('');
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Mutaciones — deben estar antes de cualquier return condicional (regla de hooks)
  const reviewDocumentMutation = useMutation({
    mutationFn: ({
      documentId,
      action,
      reviewer_notes,
    }: {
      documentId: string;
      action: 'approve' | 'reject';
      reviewer_notes: string;
    }) => preEnrollmentsService.reviewDocument(documentId, action, reviewer_notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['pre-enrollment', preEnrollment?.id] });
      setReviewingDocId(null);
      setReviewAction(null);
      setReviewNotes('');
    },
    onError: (error: any) => {
      alert(error.response?.data?.reviewer_notes?.[0] || error.response?.data?.message || 'Error al revisar el documento');
    },
  });

  const reviewDocumentsMutation = useMutation({
    mutationFn: ({ action, notes }: { action: 'approve' | 'reject'; notes?: string }) =>
      preEnrollmentsService.reviewDocuments(preEnrollment?.id ?? '', action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['pre-enrollment', preEnrollment?.id] });
      setNotes('');
      alert('Documentos revisados correctamente');
    },
  });

  const scheduleExamMutation = useMutation({
    mutationFn: (data: typeof examData) =>
      preEnrollmentsService.scheduleExam(preEnrollment?.id ?? '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-enrollments'] });
      alert('Examen programado correctamente');
      setExamData({ exam_date: '', exam_mode: 'presencial', exam_location: '' });
    },
  });

  const enterScoreMutation = useMutation({
    mutationFn: ({ score, notes }: { score: number; notes?: string }) =>
      preEnrollmentsService.enterScore(preEnrollment?.id ?? '', score, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-enrollments'] });
      alert('Calificación registrada correctamente');
      setExamScore('');
      setNotes('');
    },
  });

  if (!isOpen || !preEnrollment) return null;

  const canReviewDocuments = ['admin', 'servicios_escolares', 'servicios_escolares_jefe'].includes(currentUser?.role ?? '');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
      draft:               { variant: 'default', label: 'Borrador' },
      submitted:           { variant: 'info',    label: 'Enviado' },
      under_review:        { variant: 'warning', label: 'En Revisión' },
      documents_approved:  { variant: 'success', label: 'Docs Aprobados' },
      documents_rejected:  { variant: 'danger',  label: 'Docs Rechazados' },
      payment_pending:     { variant: 'warning', label: 'Pago Pendiente' },
      payment_submitted:   { variant: 'info',    label: 'Pago Enviado' },
      payment_validated:   { variant: 'success', label: 'Pago Validado' },
      exam_scheduled:      { variant: 'info',    label: 'Examen Programado' },
      exam_completed:      { variant: 'info',    label: 'Examen Completado' },
      accepted:            { variant: 'success', label: 'Aceptado' },
      rejected:            { variant: 'danger',  label: 'Rechazado' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
      <div
        className="fixed inset-0 z-[110] overflow-y-auto"
        onClick={onClose}
      >
        <div className="flex min-h-full items-start justify-center p-6 sm:p-10">
        <div
          className="relative w-full max-w-4xl rounded-2xl shadow-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Pre-inscripción #{preEnrollment.id.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {preEnrollment.student.first_name} {preEnrollment.student.last_name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(preEnrollment.status)}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'info', label: 'Información', icon: User },
                { id: 'documents', label: 'Documentos', icon: FileText },
                { id: 'exam', label: 'Examen', icon: Calendar },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Tab: Información */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Datos del Aspirante
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Nombre Completo</p>
                      <p className="font-medium dark:text-gray-100">
                        {preEnrollment.student.first_name} {preEnrollment.student.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">CURP</p>
                      <p className="font-medium dark:text-gray-100">{preEnrollment.student.curp}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium dark:text-gray-100">
                        {preEnrollment.student.email || preEnrollment.student.user_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                      <p className="font-medium dark:text-gray-100">{preEnrollment.student.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ubicación</p>
                      <p className="font-medium dark:text-gray-100">
                        {preEnrollment.student.city}, {preEnrollment.student.state}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Programa y Periodo
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Programa</p>
                      <p className="font-medium dark:text-gray-100">
                        {preEnrollment.program.code} - {preEnrollment.program.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Periodo</p>
                      <p className="font-medium dark:text-gray-100">{preEnrollment.period.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Solicitud</p>
                      <p className="font-medium dark:text-gray-100">
                        {preEnrollment.submitted_at
                          ? new Date(preEnrollment.submitted_at).toLocaleDateString('es-MX')
                          : 'No enviado'}
                      </p>
                    </div>
                  </div>
                </div>

                {preEnrollment.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Notas</h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{preEnrollment.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Documentos */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Documentos ({preEnrollment.documents?.length || 0})
                </h3>

                {preEnrollment.documents && preEnrollment.documents.length > 0 ? (
                  <div className="space-y-3">
                    {preEnrollment.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        {/* Fila principal del documento */}
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-center space-x-3">
                            <FileText className="text-gray-400" size={20} />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {doc.document_type_display}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Subido: {new Date(doc.uploaded_at).toLocaleDateString('es-MX')}
                              </p>
                              {doc.reviewer_notes && (
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                  <span className="font-medium">Observación:</span>{' '}
                                  {doc.reviewer_notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant={
                                doc.status === 'approved'
                                  ? 'success'
                                  : doc.status === 'rejected'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {doc.status_display}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => doc.file_url && window.open(doc.file_url, '_blank')}
                            >
                              <Download size={16} className="mr-1" />
                              Ver
                            </Button>
                          </div>
                        </div>

                        {/* Formulario de revisión individual (solo staff, solo pending) */}
                        {canReviewDocuments && doc.status === 'pending' && (
                          <div className="border-t border-gray-100 dark:border-gray-600 px-4 pb-4 pt-3 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
                            {reviewingDocId === doc.id ? (
                              <div className="space-y-3">
                                <textarea
                                  placeholder="Observación para el aspirante (opcional)..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-gray-100"
                                  rows={2}
                                />
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant={reviewAction === 'approve' ? 'success' : 'danger'}
                                    onClick={() =>
                                      reviewDocumentMutation.mutate({
                                        documentId: doc.id,
                                        action: reviewAction!,
                                        reviewer_notes: reviewNotes,
                                      })
                                    }
                                    isLoading={reviewDocumentMutation.isPending}
                                  >
                                    Confirmar {reviewAction === 'approve' ? 'aprobación' : 'rechazo'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setReviewingDocId(null);
                                      setReviewAction(null);
                                      setReviewNotes('');
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => {
                                    setReviewingDocId(doc.id);
                                    setReviewAction('approve');
                                    setReviewNotes('');
                                  }}
                                >
                                  <CheckCircle size={14} className="mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setReviewingDocId(doc.id);
                                    setReviewAction('reject');
                                    setReviewNotes('');
                                  }}
                                >
                                  <XCircle size={14} className="mr-1" />
                                  Rechazar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No hay documentos subidos
                  </p>
                )}

                {/* Acciones de revisión */}
                {preEnrollment.status === 'under_review' && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Revisar Documentos
                    </h4>
                    <textarea
                      placeholder="Notas sobre la revisión (opcional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 dark:bg-gray-700 dark:text-gray-100"
                      rows={3}
                    />
                    <div className="flex space-x-3">
                      <Button
                        variant="success"
                        onClick={() =>
                          reviewDocumentsMutation.mutate({ action: 'approve', notes })
                        }
                        isLoading={reviewDocumentsMutation.isPending}
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Aprobar Documentos
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          reviewDocumentsMutation.mutate({ action: 'reject', notes })
                        }
                        isLoading={reviewDocumentsMutation.isPending}
                      >
                        <XCircle size={16} className="mr-2" />
                        Rechazar Documentos
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Examen */}
            {activeTab === 'exam' && (
              <div className="space-y-6">
                {preEnrollment.exam_date ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3">
                      Examen Programado
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-400">Fecha</p>
                        <p className="font-medium dark:text-gray-200">
                          {new Date(preEnrollment.exam_date).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-400">Modalidad</p>
                        <p className="font-medium capitalize dark:text-gray-200">
                          {preEnrollment.exam_mode?.replace('_', ' ')}
                        </p>
                      </div>
                      {preEnrollment.exam_location && (
                        <div className="col-span-2">
                          <p className="text-sm text-green-700 dark:text-green-400">Ubicación</p>
                          <p className="font-medium dark:text-gray-200">{preEnrollment.exam_location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Programar examen */}
                {preEnrollment.status === 'payment_validated' && !preEnrollment.exam_date && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Programar Examen de Admisión
                    </h4>
                    <div className="space-y-4">
                      <Input
                        type="datetime-local"
                        label="Fecha y Hora del Examen"
                        value={examData.exam_date}
                        onChange={(e) =>
                          setExamData({ ...examData, exam_date: e.target.value })
                        }
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Modalidad
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                          value={examData.exam_mode}
                          onChange={(e) =>
                            setExamData({
                              ...examData,
                              exam_mode: e.target.value as 'presencial' | 'en_linea',
                            })
                          }
                        >
                          <option value="presencial">Presencial</option>
                          <option value="en_linea">En Línea</option>
                        </select>
                      </div>
                      <Input
                        label="Ubicación"
                        placeholder="Ej: Aula 301, Edificio A"
                        value={examData.exam_location}
                        onChange={(e) =>
                          setExamData({ ...examData, exam_location: e.target.value })
                        }
                      />
                      <Button
                        onClick={() => scheduleExamMutation.mutate(examData)}
                        isLoading={scheduleExamMutation.isPending}
                        disabled={!examData.exam_date || !examData.exam_location}
                      >
                        <Calendar size={16} className="mr-2" />
                        Programar Examen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ingresar calificación */}
                {preEnrollment.status === 'exam_completed' && !preEnrollment.exam_score && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Ingresar Calificación
                    </h4>
                    <div className="space-y-4">
                      <Input
                        type="number"
                        label="Calificación (0-100)"
                        min="0"
                        max="100"
                        value={examScore}
                        onChange={(e) => setExamScore(e.target.value)}
                      />
                      <textarea
                        placeholder="Observaciones (opcional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                        rows={3}
                      />
                      <Button
                        onClick={() =>
                          enterScoreMutation.mutate({
                            score: parseFloat(examScore),
                            notes,
                          })
                        }
                        isLoading={enterScoreMutation.isPending}
                        disabled={!examScore || parseFloat(examScore) < 0 || parseFloat(examScore) > 100}
                      >
                        Guardar Calificación
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mostrar calificación */}
                {preEnrollment.exam_score !== null && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Calificación del Examen
                    </h4>
                    <p className="text-3xl font-bold text-primary-600">
                      {preEnrollment.exam_score}/100
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer */}
          <div
            className="flex justify-end p-6 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};