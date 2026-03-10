import { Table } from '@/components/molecules/Table/Table';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import type { Student } from '@/types';
import { Eye } from 'lucide-react';

interface StudentsTableProps {
  students: Student[];
  isLoading?: boolean;
  onViewDetails: (student: Student) => void;
}

export const StudentsTable = ({ students, isLoading, onViewDetails }: StudentsTableProps) => {
  const getPhotoStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'warning' as const, label: 'Pendiente' },
      approved: { variant: 'success' as const, label: 'Aprobada' },
      rejected: { variant: 'danger' as const, label: 'Rechazada' },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      masculino: 'M',
      femenino: 'F',
      otro: 'Otro',
      prefiero_no_decir: 'N/D',
    };
    return labels[gender] || gender;
  };

  return (
    <Table
      data={students}
      isLoading={isLoading}
      emptyMessage="No hay estudiantes registrados"
      columns={[
        {
          header: 'Nombre Completo',
          accessor: (row) => `${row.first_name} ${row.last_name}`,
        },
        {
          header: 'CURP',
          accessor: 'curp',
        },
        {
          header: 'Email',
          accessor: (row) => row.email || row.user_email,
        },
        {
          header: 'Ciudad',
          accessor: (row) => `${row.city}, ${row.state}`,
        },
        {
          header: 'Género',
          accessor: (row) => getGenderLabel(row.gender),
        },
        {
          header: 'Foto',
          accessor: (row) => getPhotoStatusBadge(row.photo_status),
        },
        {
          header: 'Registro',
          accessor: (row) => new Date(row.created_at).toLocaleDateString('es-MX'),
        },
        {
          header: 'Acciones',
          accessor: (row) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(row)}
            >
              <Eye size={16} className="mr-1" />
              Ver
            </Button>
          ),
        },
      ]}
    />
  );
};