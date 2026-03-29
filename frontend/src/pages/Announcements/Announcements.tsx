import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/atoms/Modal/Modal';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { announcementsService } from '@/services/announcements/announcementsService';
import { academicService } from '@/services/academic/academicService';
import { PlusCircle, Pencil, ToggleLeft, ToggleRight, Megaphone, X } from 'lucide-react';
import type { Announcement } from '@/types';

const emptyForm = {
  title: '',
  description: '',
  period: '',
  deadline: '',
  is_active: true,
};

export const Announcements = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements-all'],
    queryFn: announcementsService.getAnnouncements,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['academic-periods-all'],
    queryFn: academicService.getPeriods,
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      announcementsService.createAnnouncement({
        title: formData.title,
        description: formData.description || undefined,
        period: parseInt(formData.period),
        deadline: formData.deadline,
        is_active: formData.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-all'] });
      closeForm();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      setFormError(
        typeof data === 'string'
          ? data
          : data?.detail || data?.title?.[0] || 'Error al guardar la convocatoria.'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof announcementsService.updateAnnouncement>[1]) =>
      announcementsService.updateAnnouncement(editing!.id as unknown as number, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-all'] });
      closeForm();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      setFormError(
        typeof data === 'string'
          ? data
          : data?.detail || data?.title?.[0] || 'Error al guardar la convocatoria.'
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditing(ann);
    setFormData({
      title: ann.title,
      description: ann.description || '',
      period: String(ann.period),
      deadline: ann.deadline || '',
      is_active: ann.is_active,
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
    if (!formData.title || !formData.period || !formData.deadline) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }
    setFormError('');
    if (editing) {
      updateMutation.mutate({
        title: formData.title,
        description: formData.description || undefined,
        period: parseInt(formData.period),
        deadline: formData.deadline,
        is_active: formData.is_active,
      });
    } else {
      createMutation.mutate();
    }
  };

  const handleToggleActive = (ann: Announcement) => {
    const next = !ann.is_active;
    const label = next ? 'activar' : 'desactivar';
    if (window.confirm(`¿Deseas ${label} la convocatoria "${ann.title}"?`)) {
      announcementsService
        .updateAnnouncement(ann.id as unknown as number, { is_active: next })
        .then(() => queryClient.invalidateQueries({ queryKey: ['announcements-all'] }));
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Convocatorias de Admisión</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de convocatorias publicadas para aspirantes</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle size={18} className="mr-2" />
          Nueva Convocatoria
        </Button>
      </div>

      {/* Modal formulario */}
      <Modal isOpen={showForm} onClose={closeForm} maxWidth="2xl">
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Editar Convocatoria' : 'Nueva Convocatoria'}
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
            <label className={labelClass}>Título <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Convocatoria de Admisión 2026-B"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Periodo Académico <span className="text-red-500">*</span></label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className={fieldClass}
            >
              <option value="">Selecciona un periodo...</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha límite de registro <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Información adicional para los aspirantes..."
              className={fieldClass}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Publicar convocatoria (visible para aspirantes)
            </label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? 'Guardar Cambios' : 'Crear Convocatoria'}
            </Button>
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Lista de convocatorias */}
      {announcements.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Megaphone className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin convocatorias</h3>
            <p className="text-gray-500 mt-1">Crea la primera convocatoria de admisión.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card key={ann.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{ann.title}</h3>
                    <Badge variant={ann.is_active ? 'success' : 'danger'}>
                      {ann.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {ann.is_open && <Badge variant="warning">Abierta</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <span><span className="font-medium">Periodo:</span> {ann.period_name}</span>
                    {ann.deadline && (
                      <span><span className="font-medium">Fecha límite:</span> {ann.deadline}</span>
                    )}
                  </div>
                  {ann.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{ann.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(ann)}>
                    <Pencil size={14} className="mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={ann.is_active ? 'danger' : 'secondary'}
                    onClick={() => handleToggleActive(ann)}
                  >
                    {ann.is_active
                      ? <><ToggleRight size={14} className="mr-1" />Desactivar</>
                      : <><ToggleLeft size={14} className="mr-1" />Activar</>
                    }
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
