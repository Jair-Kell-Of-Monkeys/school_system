import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { StaffTable } from '@/components/organisms/StaffTable/StaffTable';
import { AssignProgramsModal } from '@/components/organisms/AssignProgramsModal/AssignProgramsModal';
import { staffService } from '@/services/staff/staffService';
import type { StaffUser } from '@/types';
import { Users, AlertCircle, BookOpen } from 'lucide-react';

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

// ── Staff ─────────────────────────────────────────────────────────────────

export const Staff = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: staffList, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff-list'],
    queryFn: staffService.getStaffList,
  });

  const { data: availablePrograms = [] } = useQuery({
    queryKey: ['available-programs'],
    queryFn: staffService.getAvailablePrograms,
  });

  const { data: stats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: staffService.getStats,
  });

  const assignProgramsMutation = useMutation({
    mutationFn: ({ userId, programIds }: { userId: string; programIds: number[] }) =>
      staffService.assignPrograms(userId, programIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

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
    <div className="space-y-6 animate-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-info-bg)' }}
          >
            <Users size={20} style={{ color: 'var(--color-info)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Gestión de Encargados
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Administra los encargados y sus programas asignados
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total encargados"
            value={stats.total_encargados}
            icon={<Users size={18} />}
            iconBg="var(--color-info-bg)"
            iconColor="var(--color-info)"
          />
          <StatCard
            label="Sin programas asignados"
            value={stats.encargados_sin_programas}
            icon={<AlertCircle size={18} />}
            iconBg="var(--color-warning-bg)"
            iconColor="var(--color-warning)"
          />
          <StatCard
            label="Programas sin encargado"
            value={stats.programas_sin_encargado}
            icon={<BookOpen size={18} />}
            iconBg="var(--color-danger-bg)"
            iconColor="var(--color-danger)"
          />
        </div>
      )}

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <Card padding="none">
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lista de Encargados
          </h2>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
          >
            {staffList?.length ?? 0} registros
          </span>
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
