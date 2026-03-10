import { Table } from '@/components/molecules/Table/Table';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import type { PreEnrollment } from '@/types';
import { Eye } from 'lucide-react';

interface PreEnrollmentsTableProps {
  preEnrollments: PreEnrollment[];
  isLoading?: boolean;
  onViewDetails: (preEnrollment: PreEnrollment) => void;
}

export const PreEnrollmentsTable = ({
  preEnrollments,
  isLoading,
  onViewDetails,
}: PreEnrollmentsTableProps) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
      draft: { variant: 'default', label: 'Borrador' },
      submitted: { variant: 'info', label: 'Enviado' },
      under_review: { variant: 'warning', label: 'En Revisión' },
      documents_rejected: { variant: 'danger', label: 'Docs Rechazados' },
      documents_approved: { variant: 'success', label: 'Docs Aprobados' },
      payment_pending: { variant: 'warning', label: 'Pago Pendiente' },
      payment_submitted: { variant: 'info', label: 'Pago Enviado' },
      payment_validated: { variant: 'success', label: 'Pago Validado' },
      exam_scheduled: { variant: 'info', label: 'Examen Programado' },
      exam_completed: { variant: 'info', label: 'Examen Realizado' },
      accepted: { variant: 'success', label: 'Aceptado' },
      rejected: { variant: 'danger', label: 'Rechazado' },
      cancelled: { variant: 'default', label: 'Cancelado' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Table
      data={preEnrollments}
      isLoading={isLoading}
      emptyMessage="No hay pre-inscripciones registradas"
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
          header: 'Periodo',
          accessor: 'period_name',
        },
        {
          header: 'Estado',
          accessor: (row) => getStatusBadge(row.status),
        },
        {
          header: 'Calificación',
          accessor: (row) =>
            row.exam_score ? (
              <span className="font-semibold text-green-600">{row.exam_score}</span>
            ) : (
              <span className="text-gray-400">-</span>
            ),
        },
        {
          header: 'Fecha',
          accessor: (row) =>
            row.submitted_at
              ? new Date(row.submitted_at).toLocaleDateString('es-MX')
              : new Date(row.created_at).toLocaleDateString('es-MX'),
        },
        {
          header: 'Acciones',
          accessor: (row) => (
            <Button size="sm" variant="outline" onClick={() => onViewDetails(row)}>
              <Eye size={16} className="mr-1" />
              Ver
            </Button>
          ),
        },
      ]}
    />
  );
};