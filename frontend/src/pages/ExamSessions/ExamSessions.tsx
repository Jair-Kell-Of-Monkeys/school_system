import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/atoms/Modal/Modal';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input } from '@/components/atoms/Input/Input';
import { examsService } from '@/services/exams/examsService';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { useAuthStore } from '@/store/authStore';
import { ROLES } from '@/config/constants';
import type { ExamSession, ExamSessionDetail, ExamAspirant } from '@/types';
import {
  ClipboardList, Plus, X, Trash2, ChevronLeft, ChevronRight,
  Send, Eye, CheckCircle, XCircle, Loader2, Users,
  Calendar, MapPin, BookOpen,
} from 'lucide-react';

// ── Status maps ───────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  draft:     'warning',
  published: 'info',
  completed: 'success',
};

// ── Shared input style ────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

const inputSty = {
  background: 'var(--bg-surface-2)',
  border: '1.5px solid var(--border)',
  color: 'var(--text-primary)',
} as const;


// ── Venue row ─────────────────────────────────────────────────────────────

interface VenueRow {
  program: string;
  building: string;
  room: string;
  capacity: string;
}

// ── Section title ─────────────────────────────────────────────────────────

const SectionTitle = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mb-3">
    <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
      {label}
    </p>
    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
  </div>
);

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
    exam_type: 'propio' as 'propio' | 'cenaval',
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
        (err as { response?: { data?: { venues?: string[] } } })?.response?.data?.venues?.[0] ??
        'Error al crear la sesión. Verifica los datos.';
      alert(msg);
    },
  });

  const handleAddVenue = () =>
    setVenues((prev) => [...prev, { program: '', building: '', room: '', capacity: '' }]);

  const handleRemoveVenue = (idx: number) =>
    setVenues((prev) => prev.filter((_, i) => i !== idx));

  const handleVenueChange = (idx: number, field: keyof VenueRow, value: string) =>
    setVenues((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));

  const capacityByProgram: Record<string, number> = {};
  for (const v of venues) {
    if (v.program && v.capacity) {
      const cap = parseInt(v.capacity) || 0;
      capacityByProgram[v.program] = (capacityByProgram[v.program] ?? 0) + cap;
    }
  }

  const handleSubmit = () => {
    const incomplete = venues.some((v) => !v.program || !v.building || !v.room || !v.capacity);
    if (incomplete) { alert('Completa todos los campos de cada salón.'); return; }
    createMutation.mutate({
      name: formData.name,
      period: parseInt(formData.period),
      exam_date: formData.exam_date,
      exam_time: formData.exam_time,
      mode: formData.mode,
      exam_type: formData.exam_type,
      passing_score: parseInt(formData.passing_score),
      venues: venues.map((v) => ({
        program: parseInt(v.program),
        building: v.building,
        room: v.room,
        capacity: parseInt(v.capacity),
      })),
    });
  };

  const labelSty = { color: 'var(--text-secondary)' };

  return (
    <Modal isOpen onClose={onClose} maxWidth="3xl" align="top">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Nueva Sesión de Examen
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Configura la sesión y sus salones de examen
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* General fields */}
          <section>
            <SectionTitle label="Datos generales" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Nombre de la sesión <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Examen de Admisión 2026-1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Periodo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className={inputCls}
                  style={inputSty}
                >
                  <option value="">Selecciona un periodo…</option>
                  {periods.map((p: { id: number; name: string }) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Modalidad <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'presencial' | 'en_linea' })}
                  className={inputCls}
                  style={inputSty}
                >
                  <option value="presencial">Presencial</option>
                  <option value="en_linea">En Línea</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Tipo de examen <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.exam_type}
                  onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as 'propio' | 'cenaval' })}
                  className={inputCls}
                  style={inputSty}
                >
                  <option value="propio">Propio</option>
                  <option value="cenaval">CENAVAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.exam_date}
                  onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                  style={inputSty}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Hora <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.exam_time}
                  onChange={(e) => setFormData({ ...formData, exam_time: e.target.value })}
                  className={inputCls}
                  style={inputSty}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelSty}>
                  Calificación mínima aprobatoria (0–100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                  className={inputCls}
                  style={inputSty}
                />
              </div>
            </div>
          </section>

          {/* Live aspirant counter */}
          {formData.period && aspirantCounts.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
              }}
            >
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-info)' }}>
                Aspirantes con pago validado en el periodo seleccionado
              </p>
              <div className="flex flex-wrap gap-2">
                {aspirantCounts.map((ac) => {
                  const configured = capacityByProgram[ac.program_id.toString()] ?? 0;
                  const sufficient = configured >= ac.aspirant_count;
                  const style =
                    configured === 0
                      ? { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                      : sufficient
                      ? { background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' }
                      : { background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' };
                  return (
                    <span key={ac.program_id} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={style}>
                      {ac.program_code}: {ac.aspirant_count} aspirantes
                      {configured > 0 && ` / ${configured} lugares`}
                      {configured > 0 && !sufficient && ' ⚠️'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Venues */}
          <section>
            <SectionTitle label="Salones de examen" />
            <div className="space-y-2 mb-2">
              {venues.map((venue, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center rounded-xl p-3"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
                >
                  <div className="col-span-4">
                    <select
                      value={venue.program}
                      onChange={(e) => handleVenueChange(idx, 'program', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      style={inputSty}
                    >
                      <option value="">Programa…</option>
                      {programs.map((p: { id: number; code: string; name: string }) => (
                        <option key={p.id} value={p.id}>{p.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Edificio"
                      value={venue.building}
                      onChange={(e) => handleVenueChange(idx, 'building', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      style={inputSty}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Salón"
                      value={venue.room}
                      onChange={(e) => handleVenueChange(idx, 'room', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      style={inputSty}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Cap."
                      value={venue.capacity}
                      onChange={(e) => handleVenueChange(idx, 'capacity', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      style={inputSty}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {venues.length > 1 && (
                      <button
                        onClick={() => handleRemoveVenue(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddVenue}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus size={13} />
              Agregar salón
            </button>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Columnas: Programa · Edificio · Salón · Capacidad
            </p>
          </section>
        </div>

        <div
          className="flex justify-end gap-3 p-6 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
            disabled={!formData.name || !formData.period || !formData.exam_date || !formData.exam_time}
          >
            Crear Sesión
          </Button>
        </div>
    </Modal>
  );
};

// ── Grading Panel ──────────────────────────────────────────────────────────

interface GradingPanelProps {
  session: ExamSessionDetail;
  onClose: () => void;
}

const GradingPanel = ({ session, onClose }: GradingPanelProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isJefePanel = user?.role === ROLES.ADMIN || user?.role === ROLES.JEFE_SERVICIOS;
  const [scores, setScores] = useState<Record<string, string>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data: aspirants = [], refetch } = useQuery({
    queryKey: ['aspirants', session.id],
    queryFn: () => examsService.getAspirants(session.id),
  });

  const { data: capacityStatus = [] } = useQuery({
    queryKey: ['capacity-status', session.id],
    queryFn: () => examsService.getCapacityStatus(session.id),
    enabled: isJefePanel && session.status === 'published',
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
      await examsService.gradeAspirant(session.id, aspirant.id, { attended, exam_score: scoreVal });
      queryClient.invalidateQueries({ queryKey: ['aspirants', session.id] });
      queryClient.invalidateQueries({ queryKey: ['capacity-status', session.id] });
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
    <Modal isOpen onClose={onClose} maxWidth="5xl" align="top">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {session.name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {session.period_name} · {session.exam_date} · Aprobatoria: {session.passing_score}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
            >
              {gradedCount}/{aspirants.length} calificados
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Capacity status — jefe only */}
          {isJefePanel && session.status === 'published' && capacityStatus.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users size={15} style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Estado de cupo por programa
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {capacityStatus.map((cs) => {
                  const pct = cs.max_capacity > 0 ? cs.accepted_count / cs.max_capacity : 0;
                  const full = cs.available_spots === 0;
                  return (
                    <div
                      key={cs.program_id}
                      className="rounded-xl p-3"
                      style={{
                        background: full ? 'var(--color-danger-bg)' : 'var(--bg-surface)',
                        border: `1px solid ${full ? 'var(--color-danger-border)' : 'var(--border)'}`,
                      }}
                    >
                      <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{cs.program_code}</p>
                      <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-muted)' }}>{cs.program_name}</p>
                      <div
                        className="w-full rounded-full h-1.5 mb-1.5"
                        style={{ background: 'var(--border)' }}
                      >
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round(pct * 100))}%`,
                            background: full ? 'var(--color-danger)' : 'var(--color-success)',
                          }}
                        />
                      </div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: full ? 'var(--color-danger)' : 'var(--color-success)' }}
                      >
                        {cs.accepted_count}/{cs.max_capacity} aceptados
                        {full ? ' — Cupo lleno' : ` — ${cs.available_spots} disponibles`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {aspirants.length === 0 ? (
            <div className="text-center py-14">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--bg-surface-2)' }}
              >
                <ClipboardList size={26} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Sin aspirantes
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No hay aspirantes asignados a esta sesión todavía.
              </p>
            </div>
          ) : (
            Object.entries(programGroups).map(([programCode, list]) => (
              <div key={programCode}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  {programCode} — {list[0].program_name}
                </p>
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Aspirante', 'Sede', 'Estado', 'Asistencia', 'Calificación', ''].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((aspirant) => {
                        const isGraded =
                          aspirant.status === 'accepted' || aspirant.status === 'rejected';
                        return (
                          <tr
                            key={aspirant.id}
                            style={{ borderBottom: '1px solid var(--border)' }}
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                                {aspirant.student_name}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {aspirant.student_curp}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {aspirant.exam_location ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  aspirant.status === 'accepted' ? 'success'
                                    : aspirant.status === 'rejected' ? 'danger'
                                    : 'warning'
                                }
                              >
                                {aspirant.status_display}
                              </Badge>
                            </td>

                            {isGraded ? (
                              <>
                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>—</td>
                                <td className="px-4 py-3">
                                  {aspirant.exam_score !== null ? (
                                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                      {aspirant.exam_score}
                                    </span>
                                  ) : (
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ausente</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {aspirant.status === 'accepted'
                                    ? <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                                    : <XCircle size={16} style={{ color: 'var(--color-danger)' }} />
                                  }
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3">
                                  <div className="flex gap-3">
                                    {[
                                      { val: true,  label: 'Sí' },
                                      { val: false, label: 'No' },
                                    ].map(({ val, label }) => (
                                      <label key={label} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                                        <input
                                          type="radio"
                                          name={`attended-${aspirant.id}`}
                                          checked={attendanceMap[aspirant.id] === val}
                                          onChange={() =>
                                            setAttendanceMap((p) => ({ ...p, [aspirant.id]: val }))
                                          }
                                        />
                                        {label}
                                      </label>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {attendanceMap[aspirant.id] === true && (
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.01}
                                      placeholder="0-100"
                                      value={scores[aspirant.id] ?? ''}
                                      onChange={(e) =>
                                        setScores((p) => ({ ...p, [aspirant.id]: e.target.value }))
                                      }
                                      className="w-20 px-2 py-1 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                      style={inputSty}
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3">
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
            ))
          )}
        </div>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────

export const ExamSessions = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ExamSessionDetail | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const isJefe = user?.role === ROLES.ADMIN || user?.role === ROLES.JEFE_SERVICIOS;

  const { data, isLoading } = useQuery({
    queryKey: ['exam-sessions', page, statusFilter],
    queryFn: () => examsService.getSessions({ page, status: statusFilter || undefined }),
  });

  const { data: selectedDetail } = useQuery({
    queryKey: ['exam-session-detail', selectedSession?.id],
    queryFn: () => examsService.getSession(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const handlePublish = async (session: ExamSession) => {
    if (!window.confirm(`¿Publicar "${session.name}"? Se asignarán aspirantes automáticamente en segundo plano.`))
      return;
    setPublishingId(session.id);
    try {
      await examsService.publishSession(session.id);
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      alert('Sesión publicada. Los aspirantes recibirán su asignación por correo.');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string; deficits?: unknown[] } } })?.response?.data;
      if (errData?.deficits) {
        const deficits = errData.deficits as Array<{ program: string; aspirants: number; capacity: number; deficit: number }>;
        const lines = deficits.map((d) => `  • ${d.program}: ${d.aspirants} aspirantes, capacidad ${d.capacity} (déficit: ${d.deficit})`).join('\n');
        alert(`Capacidad insuficiente:\n${lines}`);
      } else {
        alert(errData?.error ?? 'Error al publicar. Intenta de nuevo.');
      }
    } finally {
      setPublishingId(null);
    }
  };

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  // Derived stats
  const totalSessions  = data?.count ?? 0;
  const published      = data?.results?.filter((s) => s.status === 'published').length ?? 0;
  const totalCapacity  = data?.results?.reduce((sum, s) => sum + (s.total_capacity ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-warning-bg)' }}
          >
            <ClipboardList size={20} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Exámenes de Admisión
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isJefe
                ? 'Crea y publica sesiones de examen para aspirantes'
                : 'Consulta y califica aspirantes asignados a tu programa'}
            </p>
          </div>
        </div>
        {isJefe && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
          >
            <Plus size={15} />
            Nueva Sesión
          </button>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total sesiones',       value: totalSessions, icon: <ClipboardList size={16} />, bg: 'var(--color-info-bg)',    color: 'var(--color-info)' },
            { label: 'Sesiones publicadas',  value: published,     icon: <BookOpen size={16} />,      bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
            { label: 'Lugares configurados', value: totalCapacity, icon: <Users size={16} />,         bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
          ].map(({ label, value, icon, bg, color }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
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
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
            Filtrar por estado:
          </p>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            style={inputSty}
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </div>

      {/* ── Sessions list ────────────────────────────────────────────────── */}
      <Card padding="none">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sesiones de Examen
          </h2>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
          >
            {data?.count ?? 0} sesiones
          </span>
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
              <ClipboardList size={26} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Sin sesiones
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isJefe ? 'Crea la primera sesión de examen.' : 'No hay sesiones de examen configuradas.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ '--tw-divide-color': 'var(--border)' } as React.CSSProperties}>
              {data.results.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-[var(--bg-surface-2)]"
                >
                  {/* Left: session info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background:
                          session.status === 'completed' ? 'var(--color-success-bg)'
                          : session.status === 'published' ? 'var(--color-info-bg)'
                          : 'var(--color-warning-bg)',
                      }}
                    >
                      <ClipboardList
                        size={16}
                        style={{
                          color:
                            session.status === 'completed' ? 'var(--color-success)'
                            : session.status === 'published' ? 'var(--color-info)'
                            : 'var(--color-warning)',
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {session.name}
                        </p>
                        <Badge variant={STATUS_VARIANT[session.status] ?? 'default'}>
                          {session.status_display}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {session.exam_date} a las {session.exam_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {session.mode === 'presencial' ? 'Presencial' : 'En Línea'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {session.total_capacity} lugares
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isJefe && session.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handlePublish(session)}
                        isLoading={publishingId === session.id}
                        disabled={publishingId === session.id}
                      >
                        {publishingId === session.id ? (
                          <><Loader2 size={13} className="mr-1 animate-spin" />Publicando…</>
                        ) : (
                          <><Send size={13} className="mr-1" />Publicar</>
                        )}
                      </Button>
                    )}
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                      onClick={async () => {
                        const detail = await examsService.getSession(session.id);
                        setSelectedSession(detail);
                      }}
                    >
                      <Eye size={13} />
                      {session.status === 'published' ? 'Calificar' : 'Ver'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-6 py-4 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {data.count} sesiones
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

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}

      {selectedSession && (selectedDetail || selectedSession) && (
        <GradingPanel
          session={(selectedDetail ?? selectedSession) as ExamSessionDetail}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};
