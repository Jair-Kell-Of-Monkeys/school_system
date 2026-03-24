import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { StaffTable } from '@/components/organisms/StaffTable/StaffTable';
import { AssignProgramsModal } from '@/components/organisms/AssignProgramsModal/AssignProgramsModal';
import { staffService } from '@/services/staff/staffService';
import type { StaffUser } from '@/types';
import { Users, AlertCircle } from 'lucide-react';

export const Staff = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener lista de encargados
  const { data: staffList, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff-list'],
    queryFn: staffService.getStaffList,
  });

  // Obtener programas disponibles
  const { data: availablePrograms = [] } = useQuery({
    queryKey: ['available-programs'],
    queryFn: staffService.getAvailablePrograms,
  });

  // Obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: staffService.getStats,
  });

  // Mutación para asignar programas
  const assignProgramsMutation = useMutation({
    mutationFn: ({ userId, programIds }: { userId: string; programIds: number[] }) =>
      staffService.assignPrograms(userId, programIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

  // Only show programs that are NOT assigned to another encargado
  const getProgramsForModal = (forUser: StaffUser) => {
    const assignedToOthers = new Set<number>();
    (staffList ?? []).forEach((staff) => {
      if (staff.id !== forUser.id) {
        staff.assigned_programs.forEach((p) => assignedToOthers.add(p.id));
      }
    });
    return availablePrograms.filter((p) => !assignedToOthers.has(p.id));
  };

  const handleManagePrograms = (user: StaffUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSavePrograms = async (userId: string, programIds: number[]) => {
    await assignProgramsMutation.mutateAsync({ userId, programIds });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gestión de Encargados
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra los encargados y sus programas asignados
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Encargados</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {stats.total_encargados}
                </p>
              </div>
              <Users className="text-primary-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sin Programas</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {stats.encargados_sin_programas}
                </p>
              </div>
              <AlertCircle className="text-yellow-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Programas Sin Encargado</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {stats.programas_sin_encargado}
                </p>
              </div>
              <AlertCircle className="text-red-600" size={40} />
            </div>
          </Card>
        </div>
      )}

      {/* Tabla de Encargados */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Lista de Encargados
          </h2>
        </div>
        <StaffTable
          staff={staffList || []}
          isLoading={isLoadingStaff}
          onManagePrograms={handleManagePrograms}
        />
      </Card>

      {/* Modal de Asignación */}
      <AssignProgramsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        availablePrograms={selectedUser ? getProgramsForModal(selectedUser) : availablePrograms}
        onSave={handleSavePrograms}
      />
    </div>
  );
};