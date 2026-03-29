import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/atoms/Modal/Modal';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { credentialsService } from '@/services/credentials/credentialsService';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { PlusCircle, Send, Calendar, FileText, X, Lock } from 'lucide-react';

const statusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' => {
  if (status === 'activa') return 'success';
  if (status === 'cerrada') return 'danger';
  return 'warning';
};

const STATUS_TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'activa', label: 'Activas' },
  { key: 'cerrada', label: 'Cerradas' },
] as const;
type TabKey = (typeof STATUS_TABS)[number]['key'];

export const Credentials = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TabKey>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    period: '',
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [formError, setFormError] = useState('');

  const { data: convocatorias = [], isLoading } = useQuery({
    queryKey: ['credential-convocatorias-all'],
    queryFn: () => credentialsService.getConvocatorias(),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['credential-requests-staff'],
    queryFn: () => credentialsService.getRequests(),
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods-active'],
    queryFn: aspirantService.getActivePeriods,
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      credentialsService.createConvocatoria({
        title: formData.title,
        description: formData.description || undefined,
        requirements: formData.requirements || undefined,
        period: parseInt(formData.period),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-convocatorias-all'] });
      setShowForm(false);
      setFormData({ title: '', description: '', requirements: '', period: '', fecha_inicio: '', fecha_fin: '' });
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail || 'Error al crear la convocatoria.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => credentialsService.publishConvocatoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-convocatorias-all'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => credentialsService.closeConvocatoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-convocatorias-all'] });
      queryClient.invalidateQueries({ queryKey: ['credential-requests-staff'] });
    },
  });

  const handleCreate = () => {
    if (!formData.title || !formData.period || !formData.fecha_inicio || !formData.fecha_fin) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }
    setFormError('');
    createMutation.mutate();
  };

  // Global stats
  const totalPending = allRequests.filter((r) => r.status === 'pendiente').length;
  const totalGenerated = allRequests.filter((r) => r.status === 'generada').length;
  const totalRequests = allRequests.length;

  const filtered = statusFilter === 'all' ? convocatorias : convocatorias.filter((c) => c.status === statusFilter);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Credencialización</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de convocatorias de credenciales estudiantiles</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusCircle size={18} className="mr-2" />
          Nueva Convocatoria
        </Button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total solicitudes', value: totalRequests, color: 'var(--text-primary)' },
          { label: 'Pendientes', value: totalPending, color: 'var(--color-warning)' },
          { label: 'Credenciales emitidas', value: totalGenerated, color: 'var(--color-success)' },
        ].map((stat) => (
          <Card key={stat.label} className="text-center py-3">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Modal de creación */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setFormError(''); }}
        maxWidth="2xl"
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva Convocatoria</h2>
          <button
            onClick={() => { setShowForm(false); setFormError(''); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Credencialización Periodo 2026-A"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Periodo Académico <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Selecciona un periodo...</option>
                {periods.map((p: { id: number; name: string }) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inicio de solicitudes <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cierre de solicitudes <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Requisitos de fotografía
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={2}
                placeholder="Ej: Fondo blanco, reciente, sin lentes..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="flex gap-3">
              <Button onClick={handleCreate} isLoading={createMutation.isPending}>
                Crear Convocatoria
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Filter tabs */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <nav className="flex gap-1">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'all'
              ? convocatorias.length
              : convocatorias.filter((c) => c.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className="py-2.5 px-4 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: statusFilter === tab.key ? '#6366f1' : 'transparent',
                  color: statusFilter === tab.key ? '#6366f1' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: statusFilter === tab.key ? '#eef2ff' : 'var(--bg-surface-2)',
                      color: statusFilter === tab.key ? '#6366f1' : 'var(--text-muted)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Lista de convocatorias */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin convocatorias</h3>
            <p className="text-gray-500 mt-1">No hay convocatorias en esta categoría.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((conv) => {
            const convRequests = allRequests.filter((r) => r.convocatoria === conv.id);
            const convPending = convRequests.filter((r) => r.status === 'pendiente').length;
            const convGenerated = convRequests.filter((r) => r.status === 'generada').length;

            return (
              <Card key={conv.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{conv.title}</h3>
                      <Badge variant={statusBadgeVariant(conv.status)}>{conv.status_display}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span className="font-medium">Periodo:</span> {conv.period_name}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {conv.fecha_inicio} → {conv.fecha_fin}
                      </span>
                    </div>
                    {convRequests.length > 0 && (
                      <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Total solicitudes: <strong>{convRequests.length}</strong></span>
                        <span style={{ color: 'var(--color-warning)' }}>Pendientes: <strong>{convPending}</strong></span>
                        <span style={{ color: 'var(--color-success)' }}>Emitidas: <strong>{convGenerated}</strong></span>
                      </div>
                    )}
                    {conv.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{conv.description}</p>
                    )}
                    {conv.requirements && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Requisitos foto:</span> {conv.requirements}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {conv.status === 'borrador' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (window.confirm('¿Publicar esta convocatoria? Los alumnos podrán verla y enviar solicitudes.')) {
                            publishMutation.mutate(conv.id);
                          }
                        }}
                        isLoading={publishMutation.isPending}
                      >
                        <Send size={16} className="mr-1" />
                        Publicar
                      </Button>
                    )}
                    {conv.status === 'activa' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm('¿Cerrar esta convocatoria? No se aceptarán nuevas solicitudes.')) {
                            closeMutation.mutate(conv.id);
                          }
                        }}
                        isLoading={closeMutation.isPending}
                      >
                        <Lock size={16} className="mr-1" />
                        Cerrar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
