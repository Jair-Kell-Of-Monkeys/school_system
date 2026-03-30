import { Table } from '@/components/molecules/Table/Table';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import type { StaffUser } from '@/types';
import { Settings } from 'lucide-react';

interface StaffTableProps {
  staff: StaffUser[];
  isLoading?: boolean;
  onManagePrograms: (user: StaffUser) => void;
}

export const StaffTable = ({ staff, isLoading, onManagePrograms }: StaffTableProps) => {
  return (
    <Table
      data={staff}
      isLoading={isLoading}
      emptyMessage="No hay encargados registrados"
      columns={[
        {
          header: 'Email',
          accessor: 'email',
        },
        {
          header: 'Estado',
          accessor: (row) => (
            <Badge variant={row.is_active ? 'success' : 'danger'}>
              {row.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
        {
          header: 'Programas Asignados',
          accessor: (row) => (
            <div className="flex flex-wrap gap-1">
              {row.assigned_programs.length > 0 ? (
                row.assigned_programs.map((program) => (
                  <Badge key={program.id} variant="info">
                    {program.code}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400 text-xs">Sin programas</span>
              )}
            </div>
          ),
        },
        {
          header: 'Fecha de Registro',
          accessor: (row) => new Date(row.date_joined).toLocaleDateString('es-MX'),
        },
        {
          header: 'Acciones',
          accessor: (row) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManagePrograms(row)}
            >
              <Settings size={16} className="mr-1" />
              Gestionar
            </Button>
          ),
        },
      ]}
    />
  );
};