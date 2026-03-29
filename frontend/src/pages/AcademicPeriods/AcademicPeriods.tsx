import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/atoms/Modal/Modal';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { academicService } from '@/services/academic/academicService';
import { PlusCircle, Pencil, Zap, X, Calendar } from 'lucide-react';
import type { AcademicPeriod } from '@/types';

const emptyForm = {
  name: '',
  start_date: '',
  end_date: '',
  enrollment_start: '',
  enrollment_end: '',
};

export const AcademicPeriods = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AcademicPeriod | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['academic-periods-all'],
    queryFn: academicService.getPeriods,
  });

  const createMutation = useMutation({
    mutationFn: () => academicService.createPeriod(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods-all'] });
      closeForm();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      setFormError(
        typeof data === 'string'
          ? data
          : data?.detail || data?.name?.[0] || 'Error al guardar el periodo.'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => academicService.updatePeriod(editing!.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods-all'] });
      closeForm();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      setFormError(
        typeof data === 'string'
          ? data
          : data?.detail || data?.name?.[0] || 'Error al guardar el periodo.'
      );
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => academicService.activatePeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods-all'] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (period: AcademicPeriod) => {
    setEditing(period);
    setFormData({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      enrollment_start: period.enrollment_start,
      enrollment_end: period.enrollment_end,
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.enrollment_start || !formData.enrollment_end) {
      setFormError('Completa todos los campos.');
      return;
    }
    setFormError('');
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const fieldClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Periodos Académicos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de periodos y fechas de inscripción</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle size={18} className="mr-2" />
          Nuevo Periodo
        </Button>
      </div>

      {/* Modal formulario */}
      <Modal isOpen={showForm} onClose={closeForm} maxWidth="2xl">
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Editar Periodo' : 'Nuevo Periodo'}
          </h2>
          <button
            onClick={closeForm}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: 2026-B"
              className={fieldClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha inicio del periodo <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha fin del periodo <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Inicio de inscripciones <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.enrollment_start}
                onChange={(e) => setFormData({ ...formData, enrollment_start: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fin de inscripciones <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.enrollment_end}
                onChange={(e) => setFormData({ ...formData, enrollment_end: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? 'Guardar Cambios' : 'Crear Periodo'}
            </Button>
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Lista de periodos */}
      {periods.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin periodos</h3>
            <p className="text-gray-500 mt-1">Crea el primer periodo académico.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <Card key={period.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{period.name}</h3>
                    {period.is_active && <Badge variant="success">Activo</Badge>}
                    {period.is_current && !period.is_active && <Badge variant="warning">En curso</Badge>}
                    {period.is_enrollment_open && <Badge variant="warning">Inscripciones abiertas</Badge>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      <span className="font-medium">Periodo:</span> {period.start_date} → {period.end_date}
                    </span>
                    <span>
                      <span className="font-medium">Inscripciones:</span> {period.enrollment_start} → {period.enrollment_end}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(period)}
                  >
                    <Pencil size={14} className="mr-1" />
                    Editar
                  </Button>
                  {!period.is_active && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`¿Activar el periodo ${period.name}? Los demás periodos quedarán inactivos.`)) {
                          activateMutation.mutate(period.id);
                        }
                      }}
                      isLoading={activateMutation.isPending}
                    >
                      <Zap size={14} className="mr-1" />
                      Activar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
