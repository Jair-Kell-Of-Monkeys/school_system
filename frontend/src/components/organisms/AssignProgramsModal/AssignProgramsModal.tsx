import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { X } from 'lucide-react';
import type { StaffUser, AcademicProgram } from '@/types';

interface AssignProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StaffUser | null;
  availablePrograms: AcademicProgram[];
  onSave: (userId: string, programIds: number[]) => Promise<void>;
}

export const AssignProgramsModal = ({
  isOpen,
  onClose,
  user,
  availablePrograms,
  onSave,
}: AssignProgramsModalProps) => {
  const [selectedPrograms, setSelectedPrograms] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedPrograms(user.assigned_programs.map((p) => p.id));
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleToggleProgram = (programId: number) => {
    setSelectedPrograms((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(user.id, selectedPrograms);
      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Error al guardar los programas.';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
      <div
        className="fixed inset-0 z-[110] overflow-y-auto"
        onClick={onClose}
      >
        <div className="flex min-h-full items-start justify-center p-6 sm:p-10">
        <div
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Asignar Programas
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Encargado: <span className="font-semibold dark:text-gray-200">{user.email}</span>
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availablePrograms.map((program) => (
              <label
                key={program.id}
                className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPrograms.includes(program.id)}
                  onChange={() => handleToggleProgram(program.id)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {program.code} - {program.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{program.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              Guardar Cambios
            </Button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};