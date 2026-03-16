import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input } from '@/components/atoms/Input/Input';
import { enrollmentsService } from '@/services/enrollments/enrollmentsService';
import { useAuthStore } from '@/store/authStore';
import type { EnrollmentDetail, EnrollmentDocument } from '@/types';
import {
  GraduationCap,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
  X,
  FileText,
  Download,
} from 'lucide-react';

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
  pending_docs: 'warning',
  docs_submitted: 'warning',
  docs_approved: 'info',
  pending_payment: 'info',
  payment_submitted: 'info',
  payment_validated: 'info',
  enrolled: 'success',
  active: 'success',
  withdrawn: 'danger',
};

const DOC_STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

// ── Detail Modal ──────────────────────────────────────────────────────────────

interface EnrollmentDetailModalProps {
  enrollment: EnrollmentDetail;
  onClose: () => void;
  onRefresh: () => void;
}

const REQUIRED_DOC_TYPES = ['numero_seguridad_social', 'certificado_bachillerato'];

const EnrollmentDetailModal = ({ enrollment, onClose, onRefresh }: EnrollmentDetailModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [confirmGroup, setConfirmGroup] = useState(enrollment.group ?? '');
  const [confirmSchedule, setConfirmSchedule] = useState(enrollment.schedule ?? '');
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  const reviewDocMutation = useMutation({
    mutationFn: ({
      documentId,
      action,
      notes,
    }: {
      documentId: string;
      action: 'approve' | 'reject';
      notes: string;
    }) => enrollmentsService.reviewDocument(enrollment.id, documentId, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollment.id] });
      onRefresh();
    },
    onError: () => {
      alert('Error al revisar el documento. Intenta de nuevo.');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      enrollmentsService.confirmEnrollment(enrollment.id, {
        group: confirmGroup.trim(),
        schedule: confirmSchedule.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      onRefresh();
      setShowConfirmForm(false);
      alert('Grupo y horario asignados correctamente.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Error al confirmar. Intenta de nuevo.';
      alert(msg);
    },
  });

  // Documentos que ya tienen archivo subido (excluye placeholders)
  const uploadedDocs = enrollment.documents.filter((d) => !!d.file_name);
  const requiredUploadedDocs = uploadedDocs.filter((d) =>
    REQUIRED_DOC_TYPES.includes(d.document_type)
  );
  const allRequiredApproved =
    requiredUploadedDocs.length === REQUIRED_DOC_TYPES.length &&
    requiredUploadedDocs.every((d) => d.status === 'approved');

  const pendingReview = uploadedDocs.filter((d) => d.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Inscripción — {enrollment.matricula}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {enrollment.student_name} · {enrollment.program_code}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANTS[enrollment.status] ?? 'default'}>
              {enrollment.status_display}
            </Badge>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {[
              { id: 'info' as const, label: 'Información' },
              {
                id: 'documents' as const,
                label: `Documentos${pendingReview > 0 ? ` (${pendingReview} pendiente${pendingReview > 1 ? 's' : ''})` : ''}`,
              },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Información */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Información del Estudiante
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Nombre:</span>{' '}
                    <span className="font-medium text-gray-900">{enrollment.student_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">CURP:</span>{' '}
                    <span className="font-medium text-gray-900">{enrollment.student_curp}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Programa:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {enrollment.program_code} — {enrollment.program_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Periodo:</span>{' '}
                    <span className="font-medium text-gray-900">{enrollment.period_name}</span>
                  </div>
                  {enrollment.student?.institutional_email && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Correo institucional:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {enrollment.student.institutional_email}
                      </span>
                    </div>
                  )}
                  {enrollment.group && (
                    <div>
                      <span className="text-gray-500">Grupo:</span>{' '}
                      <span className="font-medium text-gray-900">{enrollment.group}</span>
                    </div>
                  )}
                  {enrollment.schedule && (
                    <div>
                      <span className="text-gray-500">Horario:</span>{' '}
                      <span className="font-medium text-gray-900">{enrollment.schedule}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Asignar grupo/horario (si aún no se ha asignado) */}
              {!enrollment.group && enrollment.status === 'pending_docs' && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Asignar Grupo y Horario
                  </h3>
                  {!showConfirmForm ? (
                    <Button size="sm" variant="outline" onClick={() => setShowConfirmForm(true)}>
                      Asignar Grupo y Horario
                    </Button>
                  ) : (
                    <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grupo <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={confirmGroup}
                          onChange={(e) => setConfirmGroup(e.target.value)}
                          placeholder="Ej: ING-A"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Horario <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={confirmSchedule}
                          onChange={(e) => setConfirmSchedule(e.target.value)}
                          placeholder="Ej: Lunes-Viernes 8:00-14:00"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => confirmMutation.mutate()}
                          isLoading={confirmMutation.isPending}
                          disabled={!confirmGroup.trim() || !confirmSchedule.trim()}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowConfirmForm(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Estado de documentos requeridos */}
              {enrollment.status === 'pending_docs' && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Estado de Documentos
                  </h3>
                  {allRequiredApproved ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                      Todos los documentos requeridos han sido aprobados. La inscripción se
                      completará automáticamente.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      <FileText size={16} className="text-yellow-600 flex-shrink-0" />
                      Revisa la pestaña <strong className="mx-1">Documentos</strong> para
                      aprobar o rechazar los archivos del alumno.
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* Tab: Documentos */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              {enrollment.documents.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  El alumno aún no ha subido documentos.
                </p>
              ) : (
                enrollment.documents.map((doc: EnrollmentDocument) => {
                  const hasFile = !!doc.file_name;
                  return (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-900 text-sm">
                            {doc.document_type_display}
                          </span>
                        </div>
                        <Badge variant={DOC_STATUS_VARIANT[doc.status] ?? 'default'}>
                          {hasFile ? doc.status_display : 'Sin subir'}
                        </Badge>
                      </div>

                      {hasFile && (
                        <>
                          <p className="text-xs text-gray-500 mb-2">{doc.file_name}</p>

                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 mb-2"
                            >
                              <Eye size={12} />
                              Ver archivo
                            </a>
                          )}

                          {doc.reviewer_notes && (
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Observación:</span>{' '}
                              {doc.reviewer_notes}
                            </p>
                          )}

                          {doc.status === 'pending' && (
                            <div className="mt-3 space-y-2">
                              <textarea
                                rows={2}
                                placeholder="Observación para el alumno (requerido para rechazar)"
                                value={reviewNotes[doc.id] ?? ''}
                                onChange={(e) =>
                                  setReviewNotes((prev) => ({
                                    ...prev,
                                    [doc.id]: e.target.value,
                                  }))
                                }
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() =>
                                    reviewDocMutation.mutate({
                                      documentId: doc.id,
                                      action: 'approve',
                                      notes: reviewNotes[doc.id] ?? '',
                                    })
                                  }
                                  isLoading={reviewDocMutation.isPending}
                                >
                                  <CheckCircle size={14} className="mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={!reviewNotes[doc.id]?.trim()}
                                  onClick={() =>
                                    reviewDocMutation.mutate({
                                      documentId: doc.id,
                                      action: 'reject',
                                      notes: reviewNotes[doc.id] ?? '',
                                    })
                                  }
                                  isLoading={reviewDocMutation.isPending}
                                >
                                  <XCircle size={14} className="mr-1" />
                                  Rechazar
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const Enrollments = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const canExport = currentUser?.role === 'admin' || currentUser?.role === 'servicios_escolares_jefe';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['enrollments', page, search, statusFilter],
    queryFn: () =>
      enrollmentsService.getEnrollments({
        page,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const { data: selectedEnrollment } = useQuery({
    queryKey: ['enrollment', selectedId],
    queryFn: () => enrollmentsService.getEnrollment(selectedId!),
    enabled: !!selectedId,
  });

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await enrollmentsService.exportCsv();
    } catch {
      alert('Error al exportar el CSV. Intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inscripciones</h1>
          <p className="text-gray-600 mt-1">
            Revisión de documentos y confirmación de inscripciones formales
          </p>
        </div>
        {canExport && (
          <Button
            variant="outline"
            onClick={handleExportCsv}
            isLoading={isExporting}
          >
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder="Buscar por nombre, matrícula, CURP..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              <Search size={18} />
            </Button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="pending_docs">Documentos Pendientes</option>
            <option value="enrolled">Inscrito</option>
            <option value="active">Activo</option>
            <option value="withdrawn">Baja</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-500">No se encontraron inscripciones</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Matrícula</th>
                    <th className="pb-3 pr-4 font-medium">Estudiante</th>
                    <th className="pb-3 pr-4 font-medium">Programa</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 font-medium">Docs</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.results.map((enrollment) => {
                    const pendingDocs = enrollment.documents?.filter(
                      (d) => d.status === 'pending'
                    ).length ?? 0;
                    const rejectedDocs = enrollment.documents?.filter(
                      (d) => d.status === 'rejected'
                    ).length ?? 0;

                    return (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4 font-mono font-semibold text-gray-900">
                          {enrollment.matricula}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{enrollment.student_name}</p>
                          <p className="text-xs text-gray-500">{enrollment.student_curp}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{enrollment.program_code}</p>
                          <p className="text-xs text-gray-500">{enrollment.period_name}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_VARIANTS[enrollment.status] ?? 'default'}>
                            {enrollment.status_display}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {pendingDocs > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              {pendingDocs} pendiente{pendingDocs > 1 ? 's' : ''}
                            </span>
                          )}
                          {rejectedDocs > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 ml-1">
                              {rejectedDocs} rechazado{rejectedDocs > 1 ? 's' : ''}
                            </span>
                          )}
                          {pendingDocs === 0 && rejectedDocs === 0 && enrollment.documents?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Todos aprobados
                            </span>
                          )}
                          {enrollment.documents?.length === 0 && (
                            <span className="text-xs text-gray-400">Sin docs</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedId(enrollment.id)}
                          >
                            <Eye size={14} className="mr-1" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {data.count} inscripción{data.count !== 1 ? 'es' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal de detalle */}
      {selectedId && selectedEnrollment && (
        <EnrollmentDetailModal
          enrollment={selectedEnrollment}
          onClose={() => setSelectedId(null)}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  );
};
