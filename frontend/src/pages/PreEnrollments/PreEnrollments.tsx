import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { PreEnrollmentsTable } from '@/components/organisms/PreEnrollmentsTable/PreEnrollmentsTable';
import { PreEnrollmentDetailsModal } from '@/components/organisms/PreEnrollmentDetailsModal/PreEnrollmentDetailsModal';
import { preEnrollmentsService } from '@/services/preEnrollments/preEnrollmentsService';
import type { PreEnrollment, PreEnrollmentDetail } from '@/types';
import {
  FileText, Search, TrendingUp, Clock, CheckCircle, BookOpen, X,
} from 'lucide-react';

// ── Stat card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const StatCard = ({ label, value, icon, iconBg, iconColor }: StatCardProps) => (
  <div
    className="rounded-xl p-5"
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
  >
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
    </div>
    <p className="text-3xl font-bold leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
      {value}
    </p>
    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
  </div>
);

// ── PreEnrollments ────────────────────────────────────────────────────────

export const PreEnrollments = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ status: '', program: '', period: '' });
  const [selectedPreEnrollment, setSelectedPreEnrollment] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: preEnrollmentsData, isLoading } = useQuery({
    queryKey: ['pre-enrollments', page, search, filters],
    queryFn: () => preEnrollmentsService.getPreEnrollments({ page, search, ...filters }),
  });

  const { data: stats } = useQuery({
    queryKey: ['pre-enrollments-stats'],
    queryFn: preEnrollmentsService.getStats,
  });

  const { data: preEnrollmentDetail } = useQuery({
    queryKey: ['pre-enrollment', selectedPreEnrollment],
    queryFn: () => preEnrollmentsService.getPreEnrollment(selectedPreEnrollment!),
    enabled: !!selectedPreEnrollment && isModalOpen,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleViewDetails = (preEnrollment: PreEnrollment) => {
    setSelectedPreEnrollment(preEnrollment.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPreEnrollment(null);
  };

  const hasActiveFilters = !!filters.status || !!search;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-info-bg)' }}
          >
            <FileText size={20} style={{ color: 'var(--color-info)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Pre-inscripciones
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Gestiona las solicitudes de admisión de aspirantes
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Total solicitudes"
            value={stats.total || preEnrollmentsData?.count || 0}
            icon={<FileText size={18} />}
            iconBg="var(--color-info-bg)"
            iconColor="var(--color-info)"
          />
          <StatCard
            label="En revisión"
            value={stats.by_status?.under_review || 0}
            icon={<Clock size={18} />}
            iconBg="var(--color-warning-bg)"
            iconColor="var(--color-warning)"
          />
          <StatCard
            label="Examen programado"
            value={stats.by_status?.exam_scheduled || 0}
            icon={<BookOpen size={18} />}
            iconBg="var(--color-info-bg)"
            iconColor="var(--color-info)"
          />
          <StatCard
            label="Aceptados"
            value={stats.by_status?.accepted || 0}
            icon={<CheckCircle size={18} />}
            iconBg="var(--color-success-bg)"
            iconColor="var(--color-success)"
          />
          <StatCard
            label="Tasa de aceptación"
            value={stats.acceptance_rate ? `${Math.round(stats.acceptance_rate)}%` : '—'}
            icon={<TrendingUp size={18} />}
            iconBg="var(--color-success-bg)"
            iconColor="var(--color-success)"
          />
        </div>
      )}

      {/* ── Filtros y búsqueda ───────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <form onSubmit={handleSearch}>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input with icon */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o CURP…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Status filter */}
            <select
              className="px-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            >
              <option value="">Todos los estados</option>
              <option value="submitted">Enviado</option>
              <option value="under_review">En Revisión</option>
              <option value="documents_approved">Docs Aprobados</option>
              <option value="documents_rejected">Docs Rechazados</option>
              <option value="payment_validated">Pago Validado</option>
              <option value="exam_scheduled">Examen Programado</option>
              <option value="exam_completed">Examen Realizado</option>
              <option value="accepted">Aceptado</option>
              <option value="rejected">Rechazado</option>
            </select>

            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              <Search size={14} />
              Buscar
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setFilters({ status: '', program: '', period: '' });
                  setPage(1);
                }}
              >
                <X size={14} />
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <Card padding="none">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lista de Pre-inscripciones
          </h2>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
          >
            {preEnrollmentsData?.count || 0} registros
          </span>
        </div>

        <PreEnrollmentsTable
          preEnrollments={preEnrollmentsData?.results || []}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
        />

        {/* Paginación */}
        {preEnrollmentsData && preEnrollmentsData.count > 0 && (
          <div
            className="flex items-center justify-between px-6 py-4 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Mostrando{' '}
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {((page - 1) * 20) + 1}–{Math.min(page * 20, preEnrollmentsData.count)}
              </span>{' '}
              de {preEnrollmentsData.count}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!preEnrollmentsData.previous}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!preEnrollmentsData.next}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalles */}
      <PreEnrollmentDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        preEnrollment={(preEnrollmentDetail as PreEnrollmentDetail) || null}
      />
    </div>
  );
};
