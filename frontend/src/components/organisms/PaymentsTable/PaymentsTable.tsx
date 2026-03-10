import { Table } from '@/components/molecules/Table/Table';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import type { Payment } from '@/types';
import { Eye } from 'lucide-react';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading?: boolean;
  onViewDetails: (payment: Payment) => void;
}

export const PaymentsTable = ({ payments, isLoading, onViewDetails }: PaymentsTableProps) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
      pending: { variant: 'warning', label: 'Pendiente' },
      validated: { variant: 'success', label: 'Validado' },
      rejected: { variant: 'danger', label: 'Rechazado' },
    };
    const config = variants[status] || { variant: 'warning', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(parseFloat(amount));
  };

  return (
    <Table
      data={payments}
      isLoading={isLoading}
      emptyMessage="No hay pagos registrados"
      columns={[
        {
          header: 'Aspirante',
          accessor: 'student_name',
        },
        {
          header: 'CURP',
          accessor: 'student_curp',
        },
        {
          header: 'Programa',
          accessor: (row) => (
            <div>
              <p className="font-medium">{row.program_code}</p>
              <p className="text-xs text-gray-500">{row.program_name}</p>
            </div>
          ),
        },
        {
          header: 'Tipo de Pago',
          accessor: 'payment_type_display',
        },
        {
          header: 'Monto',
          accessor: (row) => (
            <span className="font-semibold text-green-600">
              {formatAmount(row.amount)}
            </span>
          ),
        },
        {
          header: 'Fecha de Pago',
          accessor: (row) => new Date(row.payment_date).toLocaleDateString('es-MX'),
        },
        {
          header: 'Estado',
          accessor: (row) => getStatusBadge(row.status),
        },
        {
          header: 'Acciones',
          accessor: (row) => (
            <Button size="sm" variant="outline" onClick={() => onViewDetails(row)}>
              <Eye size={16} className="mr-1" />
              Revisar
            </Button>
          ),
        },
      ]}
    />
  );
};