import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input } from '@/components/atoms/Input/Input';
import { examsService } from '@/services/exams/examsService';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { useAuthStore } from '@/store/authStore';
import { ROLES } from '@/config/constants';
import type { ExamSession, ExamSessionDetail, ExamAspirant } from '@/types';
import {
  ClipboardList,
  Plus,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  draft: 'warning',
  published: 'info',
  completed: 'success',
};

// ── Venue row in create form ───────────────────────────────────────────────

interface VenueRow {
  program: string;
  building: string;
  room: string;
  capacity: string;
}

// ── Create Session Modal ───────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateSessionModal = ({ onClose, onCreated }: CreateModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    period: '',
    exam_date: '',
    exam_time: '',
    mode: 'presencial' as 'presencial' | 'en_linea',
    passing_score: '70',
  });
  const [venues, setVenues] = useState<VenueRow[]>([
    { program: '', building: '', room: '', capacity: '' },
  ]);

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-active'],
    queryFn: aspirantService.getAvailablePrograms,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods-active'],
    queryFn: aspirantService.getActivePeriods,
  });

  // Live aspirant counts for selected period
  const { data: aspirantCounts = [] } = useQuery({
    queryKey: ['aspirant-counts', formData.period],
    queryFn: () => examsService.getAspirantCounts(parseInt(formData.period)),
    enabled: !!formData.period,
  });

  const createMutation = useMutation({
    mutationFn: examsService.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      onCreated();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { non_field_errors?: string[]; venues?: string[] } } })
          ?.response?.data?.non_field_errors?.[0] ??
        (err as { response?: { data?: { venues?: string[] } } })?.response?.data
          ?.venues?.[0] ??
        'Error al crear la sesión. Verifica los datos.';
      alert(msg);
    },
  });

  const handleAddVenue = () => {
    setVenues((prev) => [...prev, { program: '', building: '', room: '', capacity: '' }]);
  };

  const handleRemoveVenue = (idx: number) => {
    setVenues((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVenueChange = (idx: number, field: keyof VenueRow, value: string) => {
    setVenues((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  // Build capacity totals per program from venues
  const capacityByProgram: Record<string, number> = {};
  for (const v of venues) {
    if (v.program && v.capacity) {
      const cap = parseInt(v.capacity) || 0;
      capacityByProgram[v.program] = (capacityByProgram[v.program] ?? 0) + cap;
    }
  }

  const handleSubmit = () => {
    const incomplete = venues.some(
      (v) => !v.program || !v.building || !v.room || !v.capacity
    );
    if (incomplete) {
      alert('Completa todos los campos de cada salón.');
      return;
    }

    createMutation.mutate({
      name: formData.name,
      period: parseInt(formData.period),
      exam_date: formData.exam_date,
      exam_time: formData.exam_time,
      mode: formData.mode,
      passing_score: parseInt(formData.passing_score),
      venues: venues.map((v) => ({
        program: parseInt(v.program),
        building: v.building,
        room: v.room,
        capacity: parseInt(v.capacity),
      })),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Nueva Sesión de Examen</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Session fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la sesión <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Examen de Admisión 2026-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periodo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecciona un periodo...</option>
                {periods.map((p: { id: number; name: string }) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mode: e.target.value as 'presencial' | 'en_linea',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="presencial">Presencial</option>
                <option value="en_linea">En Línea</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.exam_date}
                onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.exam_time}
                onChange={(e) => setFormData({ ...formData, exam_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación mínima aprobatoria (0–100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.passing_score}
                onChange={(e) =>
                  setFormData({ ...formData, passing_score: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Live aspirant counter */}
          {formData.period && aspirantCounts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                Aspirantes con pago validado en el periodo seleccionado:
              </p>
              <div className="flex flex-wrap gap-3">
                {aspirantCounts.map((ac) => {
                  const configured = capacityByProgram[ac.program_id.toString()] ?? 0;
                  const sufficient = configured >= ac.aspirant_count;
                  return (
                    <div
                      key={ac.program_id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                        configured === 0
                          ? 'bg-gray-100 text-gray-700'
                          : sufficient
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ac.program_code}: {ac.aspirant_count} aspirantes
                      {configured > 0 && ` / ${configured} lugares`}
                      {configured > 0 && !sufficient && ' ⚠️'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Venues table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Salones de Examen</h3>
              <Button size="sm" variant="outline" onClick={handleAddVenue}>
                <Plus size={14} className="mr-1" />
                Agregar salón
              </Button>
            </div>

            <div className="space-y-3">
              {venues.map((venue, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-3"
                >
                  <div className="col-span-4">
                    <select
                      value={venue.program}
                      onChange={(e) => handleVenueChange(idx, 'program', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Programa...</option>
                      {programs.map((p: { id: number; code: string; name: string }) => (
                        <option key={p.id} value={p.id}>
                          {p.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Edificio"
                      value={venue.building}
                      onChange={(e) => handleVenueChange(idx, 'building', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Salón"
                      value={venue.room}
                      onChange={(e) => handleVenueChange(idx, 'room', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Cap."
                      value={venue.capacity}
                      onChange={(e) => handleVenueChange(idx, 'capacity', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {venues.length > 1 && (
                      <button
                        onClick={() => handleRemoveVenue(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Columnas: Programa · Edificio · Salón · Capacidad
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
            disabled={
              !formData.name ||
              !formData.period ||
              !formData.exam_date ||
              !formData.exam_time
            }
          >
            Crear Sesión
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Grading Panel ──────────────────────────────────────────────────────────

interface GradingPanelProps {
  session: ExamSessionDetail;
  onClose: () => void;
}

const GradingPanel = ({ session, onClose }: GradingPanelProps) => {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data: aspirants = [], refetch } = useQuery({
    queryKey: ['aspirants', session.id],
    queryFn: () => examsService.getAspirants(session.id),
  });

  const handleGrade = async (aspirant: ExamAspirant) => {
    const attended = attendanceMap[aspirant.id];
    if (attended === undefined || attended === null) {
      alert('Selecciona si el aspirante asistió o no.');
      return;
    }
    if (attended && !scores[aspirant.id]?.trim()) {
      alert('Ingresa la calificación del aspirante.');
      return;
    }
    const scoreVal = attended ? parseFloat(scores[aspirant.id]) : null;
    if (attended && (isNaN(scoreVal!) || scoreVal! < 0 || scoreVal! > 100)) {
      alert('La calificación debe ser entre 0 y 100.');
      return;
    }

    setSaving((prev) => ({ ...prev, [aspirant.id]: true }));
    try {
      await examsService.gradeAspirant(session.id, aspirant.id, {
        attended,
        exam_score: scoreVal,
      });
      queryClient.invalidateQueries({ queryKey: ['aspirants', session.id] });
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Error al guardar. Intenta de nuevo.';
      alert(msg);
    } finally {
      setSaving((prev) => ({ ...prev, [aspirant.id]: false }));
    }
  };

  const gradedCount = aspirants.filter(
    (a) => a.status === 'accepted' || a.status === 'rejected'
  ).length;

  const programGroups = aspirants.reduce<Record<string, ExamAspirant[]>>((acc, a) => {
    const key = a.program_code;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{session.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {session.period_name} · {session.exam_date} · Aprobatoria: {session.passing_score}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {gradedCount}/{aspirants.length} calificados
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {aspirants.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto text-gray-400 mb-3" size={40} />
              <p className="text-gray-500">
                No hay aspirantes asignados a esta sesión todavía.
              </p>
            </div>
          )}

          {Object.entries(programGroups).map(([programCode, list]) => (
            <div key={programCode}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {programCode} — {list[0].program_name}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">Aspirante</th>
                      <th className="pb-2 pr-4 font-medium">Sede</th>
                      <th className="pb-2 pr-4 font-medium">Estado</th>
                      <th className="pb-2 pr-4 font-medium">Asistencia</th>
                      <th className="pb-2 pr-4 font-medium">Calificación</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((aspirant) => {
                      const isGraded =
                        aspirant.status === 'accepted' || aspirant.status === 'rejected';
                      return (
                        <tr key={aspirant.id}>
                          <td className="py-2.5 pr-4">
                            <p className="font-medium text-gray-900">{aspirant.student_name}</p>
                            <p className="text-xs text-gray-500">{aspirant.student_curp}</p>
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-gray-600">
                            {aspirant.exam_location ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge
                              variant={
                                aspirant.status === 'accepted'
                                  ? 'success'
                                  : aspirant.status === 'rejected'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {aspirant.status_display}
                            </Badge>
                          </td>

                          {isGraded ? (
                            <>
                              <td className="py-2.5 pr-4 text-xs text-gray-500">—</td>
                              <td className="py-2.5 pr-4">
                                {aspirant.exam_score !== null ? (
                                  <span className="font-mono font-bold text-gray-900">
                                    {aspirant.exam_score}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">Ausente</span>
                                )}
                              </td>
                              <td className="py-2.5">
                                {aspirant.status === 'accepted' ? (
                                  <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                  <XCircle size={16} className="text-red-500" />
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 pr-4">
                                <div className="flex gap-3">
                                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`attended-${aspirant.id}`}
                                      checked={attendanceMap[aspirant.id] === true}
                                      onChange={() =>
                                        setAttendanceMap((p) => ({
                                          ...p,
                                          [aspirant.id]: true,
                                        }))
                                      }
                                    />
                                    Sí
                                  </label>
                                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`attended-${aspirant.id}`}
                                      checked={attendanceMap[aspirant.id] === false}
                                      onChange={() =>
                                        setAttendanceMap((p) => ({
                                          ...p,
                                          [aspirant.id]: false,
                                        }))
                                      }
                                    />
                                    No
                                  </label>
                                </div>
                              </td>
                              <td className="py-2.5 pr-4">
                                {attendanceMap[aspirant.id] === true && (
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    placeholder="0-100"
                                    value={scores[aspirant.id] ?? ''}
                                    onChange={(e) =>
                                      setScores((p) => ({
                                        ...p,
                                        [aspirant.id]: e.target.value,
                                      }))
                                    }
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                )}
                              </td>
                              <td className="py-2.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleGrade(aspirant)}
                                  isLoading={saving[aspirant.id]}
                                  disabled={
                                    saving[aspirant.id] ||
                                    attendanceMap[aspirant.id] === undefined ||
                                    attendanceMap[aspirant.id] === null
                                  }
                                >
                                  Guardar
                                </Button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const ExamSessions = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ExamSessionDetail | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const isJefe =
    user?.role === ROLES.ADMIN || user?.role === ROLES.JEFE_SERVICIOS;

  const { data, isLoading } = useQuery({
    queryKey: ['exam-sessions', page, statusFilter],
    queryFn: () =>
      examsService.getSessions({
        page,
        status: statusFilter || undefined,
      }),
  });

  const { data: selectedDetail } = useQuery({
    queryKey: ['exam-session-detail', selectedSession?.id],
    queryFn: () => examsService.getSession(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const handlePublish = async (session: ExamSession) => {
    if (
      !window.confirm(
        `¿Publicar "${session.name}"? Se asignarán aspirantes automáticamente en segundo plano.`
      )
    )
      return;

    setPublishingId(session.id);
    try {
      await examsService.publishSession(session.id);
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      alert('Sesión publicada. Los aspirantes recibirán su asignación por correo.');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string; deficits?: unknown[] } } })
        ?.response?.data;
      if (errData?.deficits) {
        const deficits = errData.deficits as Array<{
          program: string;
          aspirants: number;
          capacity: number;
          deficit: number;
        }>;
        const lines = deficits
          .map(
            (d) =>
              `  • ${d.program}: ${d.aspirants} aspirantes, capacidad ${d.capacity} (déficit: ${d.deficit})`
          )
          .join('\n');
        alert(`Capacidad insuficiente:\n${lines}`);
      } else {
        alert(errData?.error ?? 'Error al publicar. Intenta de nuevo.');
      }
    } finally {
      setPublishingId(null);
    }
  };

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exámenes de Admisión</h1>
          <p className="text-gray-600 mt-1">
            {isJefe
              ? 'Crea y publica sesiones de examen para aspirantes'
              : 'Consulta y califica aspirantes asignados a tu programa'}
          </p>
        </div>
        {isJefe && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} className="mr-2" />
            Nueva Sesión
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </Card>

      {/* Sessions list */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-500">No hay sesiones de examen configuradas</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {data.results.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900">{session.name}</p>
                        <Badge variant={STATUS_VARIANT[session.status] ?? 'default'}>
                          {session.status_display}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {session.period_name} · {session.exam_date} a las {session.exam_time}
                        {' · '}
                        {session.mode === 'presencial' ? 'Presencial' : 'En Línea'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {session.venue_count} salón{session.venue_count !== 1 ? 'es' : ''} ·{' '}
                        {session.total_capacity} lugares · Aprobatoria: {session.passing_score}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Publish button (jefe + draft) */}
                    {isJefe && session.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handlePublish(session)}
                        isLoading={publishingId === session.id}
                        disabled={publishingId === session.id}
                      >
                        {publishingId === session.id ? (
                          <>
                            <Loader2 size={14} className="mr-1 animate-spin" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <Send size={14} className="mr-1" />
                            Publicar
                          </>
                        )}
                      </Button>
                    )}

                    {/* View / Grade button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const detail = await examsService.getSession(session.id);
                        setSelectedSession(detail);
                      }}
                    >
                      <Eye size={14} className="mr-1" />
                      {session.status === 'published' ? 'Calificar' : 'Ver'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">{data.count} sesiones</p>
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

      {/* Create modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}

      {/* Grading panel */}
      {selectedSession && (selectedDetail || selectedSession) && (
        <GradingPanel
          session={(selectedDetail ?? selectedSession) as ExamSessionDetail}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};
