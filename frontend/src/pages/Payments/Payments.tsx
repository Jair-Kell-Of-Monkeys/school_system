import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Input } from '@/components/atoms/Input/Input';
import { Button } from '@/components/atoms/Button/Button';
import { PaymentsTable } from '@/components/organisms/PaymentsTable/PaymentsTable';
import { PaymentValidationModal } from '@/components/organisms/PaymentValidationModal/PaymentValidationModal';
import { paymentsService } from '@/services/payments/paymentsService';
import type { Payment, PaymentDetail } from '@/types';
import { DollarSign, Search, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export const Payments = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    payment_type: '',
  });
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener lista de pagos
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', page, search, filters],
    queryFn: () => paymentsService.getPayments({ page, search, ...filters }),
  });

  // Obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ['payments-stats'],
    queryFn: paymentsService.getStats,
  });

  // Obtener detalle del pago seleccionado
  const { data: paymentDetail } = useQuery({
    queryKey: ['payment', selectedPayment],
    queryFn: () => paymentsService.getPayment(selectedPayment!),
    enabled: !!selectedPayment && isModalOpen,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
  };

  const formatAmount = (amount?: string) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(parseFloat(amount));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Validación de Pagos</h1>
        <p className="text-gray-600 mt-1">
          Revisa y valida los comprobantes de pago de los aspirantes
        </p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pagos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <DollarSign className="text-primary-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <Clock className="text-yellow-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Validados</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.validated}</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rechazados</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
              <XCircle className="text-red-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatAmount(stats.total_amount)}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={40} />
            </div>
          </Card>
        </div>
      )}

      {/* Resumen de Pagos Pendientes */}
      {stats && stats.pending > 0 && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">
                Pagos Pendientes de Validación
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Hay {stats.pending} comprobantes esperando tu revisión
              </p>
              <p className="text-sm text-yellow-700">
                Monto pendiente: <span className="font-bold">{formatAmount(stats.pending_amount)}</span>
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setFilters({ ...filters, status: 'pending' });
                setPage(1);
              }}
            >
              Ver Pendientes
            </Button>
          </div>
        </Card>
      )}

      {/* Filtros y Búsqueda */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por nombre, CURP o no. de recibo..."
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
              <option value="pending">Pendiente</option>
              <option value="validated">Validado</option>
              <option value="rejected">Rechazado</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.payment_type}
              onChange={(e) => setFilters({ ...filters, payment_type: e.target.value })}
            >
              <option value="">Todos los tipos</option>
              <option value="exam">Examen</option>
              <option value="enrollment">Inscripción</option>
              <option value="tuition">Colegiatura</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setFilters({ status: '', payment_type: '' });
              }}
            >
              Limpiar
            </Button>
            <Button type="submit">
              <Search size={16} className="mr-2" />
              Buscar
            </Button>
          </div>
        </form>
      </Card>

      {/* Tabla de Pagos */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Lista de Pagos ({paymentsData?.count || 0})
          </h2>
        </div>
        <PaymentsTable
          payments={paymentsData?.results || []}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
        />

        {/* Paginación */}
        {paymentsData && paymentsData.count > 0 && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, paymentsData.count)} de{' '}
              {paymentsData.count}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!paymentsData.previous}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!paymentsData.next}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Validación */}
      <PaymentValidationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        payment={paymentDetail || null}
      />
    </div>
  );
};