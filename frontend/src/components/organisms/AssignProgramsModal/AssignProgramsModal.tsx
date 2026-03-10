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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>

        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Asignar Programas
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Encargado: <span className="font-semibold">{user.email}</span>
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availablePrograms.map((program) => (
              <label
                key={program.id}
                className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPrograms.includes(program.id)}
                  onChange={() => handleToggleProgram(program.id)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">
                    {program.code} - {program.name}
                  </p>
                  <p className="text-sm text-gray-500">{program.description}</p>
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
  );
};