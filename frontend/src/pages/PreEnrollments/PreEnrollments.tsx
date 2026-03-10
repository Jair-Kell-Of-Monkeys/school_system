import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Input } from '@/components/atoms/Input/Input';
import { Button } from '@/components/atoms/Button/Button';
import { PreEnrollmentsTable } from '@/components/organisms/PreEnrollmentsTable/PreEnrollmentsTable';
import { PreEnrollmentDetailsModal } from '@/components/organisms/PreEnrollmentDetailsModal/PreEnrollmentDetailsModal';
import { preEnrollmentsService } from '@/services/preEnrollments/preEnrollmentsService';
import type { PreEnrollment, PreEnrollmentDetail } from '@/types';
import { FileText, Search, TrendingUp } from 'lucide-react';

export const PreEnrollments = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    program: '',
    period: '',
  });
  const [selectedPreEnrollment, setSelectedPreEnrollment] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener lista de pre-inscripciones
  const { data: preEnrollmentsData, isLoading } = useQuery({
    queryKey: ['pre-enrollments', page, search, filters],
    queryFn: () => preEnrollmentsService.getPreEnrollments({ page, search, ...filters }),
  });

  // Obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ['pre-enrollments-stats'],
    queryFn: preEnrollmentsService.getStats,
  });

  // Obtener detalle de pre-inscripción seleccionada
  const { data: preEnrollmentDetail } = useQuery({
    queryKey: ['pre-enrollment', selectedPreEnrollment],
    queryFn: () => preEnrollmentsService.getPreEnrollment(selectedPreEnrollment!),
    enabled: !!selectedPreEnrollment && isModalOpen,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pre-inscripciones</h1>
        <p className="text-gray-600 mt-1">
          Gestiona las solicitudes de admisión de aspirantes
        </p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.total || preEnrollmentsData?.count || 0}
                </p>
              </div>
              <FileText className="text-primary-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Revisión</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {stats.by_status?.under_review || 0}
                </p>
              </div>
              <div className="text-4xl">👀</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exámenes</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.by_status?.exam_scheduled || 0}
                </p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aceptados</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.by_status?.accepted || 0}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasa Aceptación</p>
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {stats.acceptance_rate ? `${Math.round(stats.acceptance_rate)}%` : '-'}
                </p>
              </div>
              <TrendingUp className="text-primary-600" size={40} />
            </div>
          </Card>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por nombre o CURP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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

            <Button type="submit">
              <Search size={16} className="mr-2" />
              Buscar
            </Button>
          </div>

          {filters.status && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilters({ status: '', program: '', period: '' });
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Tabla de Pre-inscripciones */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Lista de Pre-inscripciones ({preEnrollmentsData?.count || 0})
          </h2>
        </div>
        <PreEnrollmentsTable
          preEnrollments={preEnrollmentsData?.results || []}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
        />

        {/* Paginación */}
        {preEnrollmentsData && preEnrollmentsData.count > 0 && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, preEnrollmentsData.count)} de {preEnrollmentsData.count}
            </div>
            <div className="flex space-x-2">
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
        preEnrollment={preEnrollmentDetail || null}
      />
    </div>
  );
};