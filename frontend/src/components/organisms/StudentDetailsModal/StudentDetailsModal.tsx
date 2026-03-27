import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import type { Student } from '@/types';
import { X, Mail, Phone, MapPin, Calendar, User } from 'lucide-react';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export const StudentDetailsModal = ({ isOpen, onClose, student }: StudentDetailsModalProps) => {
  if (!isOpen || !student) return null;

  const getPhotoStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'warning' as const, label: 'Pendiente' },
      approved: { variant: 'success' as const, label: 'Aprobada' },
      rejected: { variant: 'danger' as const, label: 'Rechazada' },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return 'No especificado';
    const labels: Record<string, string> = {
      masculino: 'Masculino',
      femenino: 'Femenino',
      otro: 'Otro',
      prefiero_no_decir: 'Prefiero no decir',
    };
    return labels[gender] || gender.replace(/_/g, ' ');
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
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Detalles del Estudiante
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <User className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Nombre Completo</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {student.first_name} {student.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">CURP</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{student.curp}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Nacimiento</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {(() => {
                        const [y, m, d] = student.date_of_birth.split('-').map(Number);
                        return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        });
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Género</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {getGenderLabel(student.gender)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Mail className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {student.email || student.user_email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{student.phone}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ubicación</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {student.city}, {student.state}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estado de Fotografía */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Estado de Fotografía
              </h3>
              <div className="flex items-center space-x-2">
                {getPhotoStatusBadge(student.photo_status)}
              </div>
            </div>

            {/* Fecha de Registro */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Registrado el{' '}
                {new Date(student.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};