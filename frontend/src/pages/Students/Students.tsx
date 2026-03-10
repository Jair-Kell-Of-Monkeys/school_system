import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Input } from '@/components/atoms/Input/Input';
import { Button } from '@/components/atoms/Button/Button';
import { StudentsTable } from '@/components/organisms/StudentsTable/StudentsTable';
import { StudentDetailsModal } from '@/components/organisms/StudentDetailsModal/StudentDetailsModal';
import { studentsService } from '@/services/students/studentsService';
import type { Student } from '@/types';
import { GraduationCap, Search } from 'lucide-react';

export const Students = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    photo_status: '',
    city: '',
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener lista de estudiantes
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', page, search, filters],
    queryFn: () => studentsService.getStudents({ page, search, ...filters }),
  });

  // Obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ['students-stats'],
    queryFn: studentsService.getStats,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Estudiantes</h1>
        <p className="text-gray-600 mt-1">
          Lista completa de aspirantes y alumnos
        </p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.total || studentsData?.count || 0}
                </p>
              </div>
              <GraduationCap className="text-primary-600" size={40} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aspirantes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {stats.aspirantes || 0}
                </p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alumnos</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.alumnos || 0}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fotos Pendientes</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.fotos_pendientes || 0}
                </p>
              </div>
              <div className="text-4xl">📸</div>
            </div>
          </Card>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por nombre, CURP o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
            >
              <option value="">Todos los géneros</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.photo_status}
              onChange={(e) => setFilters({ ...filters, photo_status: e.target.value })}
            >
              <option value="">Estado de foto</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setFilters({ gender: '', photo_status: '', city: '' });
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

      {/* Tabla de Estudiantes */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Lista de Estudiantes ({studentsData?.count || 0})
          </h2>
        </div>
        <StudentsTable
          students={studentsData?.results || []}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
        />

        {/* Paginación */}
        {studentsData && studentsData.count > 0 && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, studentsData.count)} de {studentsData.count}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!studentsData.previous}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!studentsData.next}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalles del Estudiante */}
      <StudentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
};