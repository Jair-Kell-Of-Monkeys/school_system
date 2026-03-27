import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/atoms/Modal/Modal';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input } from '@/components/atoms/Input/Input';
import { enrollmentsService } from '@/services/enrollments/enrollmentsService';
import { useAuthStore } from '@/store/authStore';
import type { EnrollmentDetail, EnrollmentDocument } from '@/types';
import {
  GraduationCap, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Eye, X, FileText, Download, AlertCircle,
  Clock, Users,
} from 'lucide-react';

// ── Status maps ───────────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
  pending_docs:      'warning',
  docs_submitted:    'warning',
  docs_approved:     'info',
  pending_payment:   'info',
  payment_submitted: 'info',
  payment_validated: 'info',
  enrolled:          'success',
  active:            'success',
  withdrawn:         'danger',
};

const DOC_STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  pending:  'warning',
  approved: 'success',
  rejected: 'danger',
};

// ── Shared style helpers ─────────────────────────────────────────────────

const inputStyle = {
  background: 'var(--bg-surface-2)',
  border: '1.5px solid var(--border)',
  color: 'var(--text-primary)',
} as const;


// ── Enrollment Detail Modal ───────────────────────────────────────────────

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
      documentId, action, notes,
    }: { documentId: string; action: 'approve' | 'reject'; notes: string }) =>
      enrollmentsService.reviewDocument(enrollment.id, documentId, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollment.id] });
      onRefresh();
    },
    onError: () => { alert('Error al revisar el documento. Intenta de nuevo.'); },
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

  const uploadedDocs = enrollment.documents.filter((d) => !!d.file_name);
  const requiredUploadedDocs = uploadedDocs.filter((d) => REQUIRED_DOC_TYPES.includes(d.document_type));
  const allRequiredApproved =
    requiredUploadedDocs.length === REQUIRED_DOC_TYPES.length &&
    requiredUploadedDocs.every((d) => d.status === 'approved');
  const pendingReview = uploadedDocs.filter((d) => d.status === 'pending').length;

  return (
    <Modal isOpen onClose={onClose} maxWidth="3xl" align="top">
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Inscripción — {enrollment.matricula}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {enrollment.student_name} · {enrollment.program_code}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANTS[enrollment.status] ?? 'default'}>
              {enrollment.status_display}
            </Badge>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b" style={{ borderColor: 'var(--border)' }}>
          <nav className="flex px-6">
            {([
              { id: 'info' as const, label: 'Información' },
              {
                id: 'documents' as const,
                label: `Documentos${pendingReview > 0 ? ` (${pendingReview} pendiente${pendingReview > 1 ? 's' : ''})` : ''}`,
              },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="py-3 px-4 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: activeTab === id ? '#6366f1' : 'transparent',
                  color: activeTab === id ? '#6366f1' : 'var(--text-secondary)',
                }}
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
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Información del Estudiante
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    { label: 'Nombre',   value: enrollment.student_name },
                    { label: 'CURP',     value: enrollment.student_curp },
                    { label: 'Programa', value: `${enrollment.program_code} — ${enrollment.program_name}` },
                    { label: 'Periodo',  value: enrollment.period_name },
                    ...(enrollment.student?.institutional_email
                      ? [{ label: 'Correo institucional', value: enrollment.student.institutional_email }]
                      : []),
                    ...(enrollment.group    ? [{ label: 'Grupo',   value: enrollment.group }]    : []),
                    ...(enrollment.schedule ? [{ label: 'Horario', value: enrollment.schedule }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className={label === 'Correo institucional' ? 'col-span-2' : ''}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>{' '}
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Asignar grupo/horario */}
              {!enrollment.group && enrollment.status === 'pending_docs' && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                    Asignar Grupo y Horario
                  </p>
                  {!showConfirmForm ? (
                    <Button size="sm" variant="outline" onClick={() => setShowConfirmForm(true)}>
                      Asignar Grupo y Horario
                    </Button>
                  ) : (
                    <div
                      className="space-y-3 rounded-xl p-4"
                      style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
                    >
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Grupo <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={confirmGroup}
                          onChange={(e) => setConfirmGroup(e.target.value)}
                          placeholder="Ej: ING-A"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
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
                        <Button size="sm" variant="outline" onClick={() => setShowConfirmForm(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Estado de documentos */}
              {enrollment.status === 'pending_docs' && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                    Estado de Documentos
                  </p>
                  {allRequiredApproved ? (
                    <div
                      className="flex items-center gap-2.5 p-3 rounded-xl text-sm"
                      style={{
                        background: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success-border)',
                        color: 'var(--color-success)',
                      }}
                    >
                      <CheckCircle size={15} className="shrink-0" />
                      Todos los documentos requeridos han sido aprobados. La inscripción se completará automáticamente.
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2.5 p-3 rounded-xl text-sm"
                      style={{
                        background: 'var(--color-warning-bg)',
                        border: '1px solid var(--color-warning-border)',
                        color: 'var(--color-warning)',
                      }}
                    >
                      <FileText size={15} className="shrink-0" />
                      Revisa la pestaña <strong className="mx-1">Documentos</strong> para aprobar o rechazar los archivos del alumno.
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
                <div className="text-center py-10">
                  <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    El alumno aún no ha subido documentos.
                  </p>
                </div>
              ) : (
                enrollment.documents.map((doc: EnrollmentDocument) => {
                  const hasFile = !!doc.file_name;
                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl p-4"
                      style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={15} style={{ color: 'var(--text-muted)' }} />
                          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            {doc.document_type_display}
                          </span>
                        </div>
                        <Badge variant={DOC_STATUS_VARIANT[doc.status] ?? 'default'}>
                          {hasFile ? doc.status_display : 'Sin subir'}
                        </Badge>
                      </div>

                      {hasFile && (
                        <>
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{doc.file_name}</p>

                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium mb-2 hover:underline"
                              style={{ color: 'var(--color-info)' }}
                            >
                              <Eye size={12} />
                              Ver archivo
                            </a>
                          )}

                          {doc.reviewer_notes && (
                            <div
                              className="flex items-start gap-2 mt-2 p-2.5 rounded-lg"
                              style={{
                                background: 'var(--color-warning-bg)',
                                border: '1px solid var(--color-warning-border)',
                              }}
                            >
                              <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-semibold">Observación:</span> {doc.reviewer_notes}
                              </p>
                            </div>
                          )}

                          {doc.status === 'pending' && (
                            <div className="mt-3 space-y-2">
                              <textarea
                                rows={2}
                                placeholder="Observación para el alumno (requerido para rechazar)"
                                value={reviewNotes[doc.id] ?? ''}
                                onChange={(e) =>
                                  setReviewNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                                }
                                className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 resize-none"
                                style={inputStyle}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => reviewDocMutation.mutate({
                                    documentId: doc.id,
                                    action: 'approve',
                                    notes: reviewNotes[doc.id] ?? '',
                                  })}
                                  isLoading={reviewDocMutation.isPending}
                                >
                                  <CheckCircle size={13} className="mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={!reviewNotes[doc.id]?.trim()}
                                  onClick={() => reviewDocMutation.mutate({
                                    documentId: doc.id,
                                    action: 'reject',
                                    notes: reviewNotes[doc.id] ?? '',
                                  })}
                                  isLoading={reviewDocMutation.isPending}
                                >
                                  <XCircle size={13} className="mr-1" />
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
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────

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

  // Quick stats from loaded data
  const totalCount = data?.count ?? 0;
  const pendingDocs = data?.results?.filter((e) =>
    e.documents?.some((d) => d.status === 'pending')
  ).length ?? 0;
  const allApproved = data?.results?.filter((e) =>
    e.documents?.length > 0 && e.documents?.every((d) => d.status === 'approved')
  ).length ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-success-bg)' }}
          >
            <GraduationCap size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Inscripciones
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Revisión de documentos y confirmación de inscripciones formales
            </p>
          </div>
        </div>
        {canExport && (
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            <Download size={15} />
            {isExporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
        )}
      </div>

      {/* ── Mini stats ─────────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total inscritos',       value: totalCount,  icon: <Users size={16} />,         bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
            { label: 'Docs pendientes',        value: pendingDocs, icon: <Clock size={16} />,          bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
            { label: 'Documentos aprobados',   value: allApproved, icon: <CheckCircle size={16} />,    bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
          ].map(({ label, value, icon, bg, color }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg }}
              >
                <span style={{ color }}>{icon}</span>
              </div>
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, matrícula, CURP…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              <Search size={14} />
            </button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            style={inputStyle}
          >
            <option value="">Todos los estados</option>
            <option value="pending_docs">Documentos Pendientes</option>
            <option value="enrolled">Inscrito</option>
            <option value="active">Activo</option>
            <option value="withdrawn">Baja</option>
          </select>
        </div>
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <Card padding="none">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lista de Inscripciones
          </h2>
          {data && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
            >
              {data.count} registros
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--bg-surface-2)' }}
            >
              <GraduationCap size={26} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Sin inscripciones
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No se encontraron inscripciones con los filtros actuales
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Matrícula', 'Estudiante', 'Programa', 'Estado', 'Docs', ''].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((enrollment) => {
                    const pDocs = enrollment.documents?.filter((d) => d.status === 'pending').length ?? 0;
                    const rDocs = enrollment.documents?.filter((d) => d.status === 'rejected').length ?? 0;
                    return (
                      <tr
                        key={enrollment.id}
                        style={{ borderBottom: '1px solid var(--border)' }}
                        className="transition-colors hover:bg-[var(--bg-surface-2)]"
                      >
                        <td className="px-6 py-3 font-mono font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                          {enrollment.matricula}
                        </td>
                        <td className="px-6 py-3">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{enrollment.student_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{enrollment.student_curp}</p>
                        </td>
                        <td className="px-6 py-3">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{enrollment.program_code}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{enrollment.period_name}</p>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_VARIANTS[enrollment.status] ?? 'default'}>
                            {enrollment.status_display}
                          </Badge>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {pDocs > 0 && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
                              >
                                {pDocs} pendiente{pDocs > 1 ? 's' : ''}
                              </span>
                            )}
                            {rDocs > 0 && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                              >
                                {rDocs} rechazado{rDocs > 1 ? 's' : ''}
                              </span>
                            )}
                            {pDocs === 0 && rDocs === 0 && enrollment.documents?.length > 0 && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
                              >
                                Todos aprobados
                              </span>
                            )}
                            {enrollment.documents?.length === 0 && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin docs</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setSelectedId(enrollment.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ml-auto"
                            style={{
                              background: 'var(--bg-surface-2)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <Eye size={13} />
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-6 py-4 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {data.count} inscripción{data.count !== 1 ? 'es' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                    <ChevronLeft size={15} />
                  </Button>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {page} / {totalPages}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                    <ChevronRight size={15} />
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
