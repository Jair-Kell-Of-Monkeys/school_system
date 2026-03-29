import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Modal } from '@/components/atoms/Modal/Modal';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { credentialsService, type CredentialRequest } from '@/services/credentials/credentialsService';
import { CheckCircle, XCircle, User, Award, X } from 'lucide-react';

const PREDEFINED_REASONS = [
  'Foto con fondo no blanco',
  'Foto borrosa o de baja calidad',
  'Foto no es de frente',
  'Datos incorrectos',
];

const STATUS_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'generada', label: 'Aprobadas' },
  { key: 'rechazada', label: 'Rechazadas' },
] as const;

type TabKey = (typeof STATUS_TABS)[number]['key'];

const statusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' => {
  if (status === 'generada') return 'success';
  if (status === 'aprobada') return 'success';
  if (status === 'rechazada') return 'danger';
  return 'warning';
};

export const CredentialRequests = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('pendiente');
  const [rejectingReq, setRejectingReq] = useState<CredentialRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['credential-requests-staff'],
    queryFn: () => credentialsService.getRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => credentialsService.approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-requests-staff'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      credentialsService.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-requests-staff'] });
      setRejectingReq(null);
      setRejectionReason('');
      setRejectError('');
    },
    onError: (err: any) => {
      setRejectError(err?.response?.data?.rejection_reason?.[0] || 'Error al rechazar.');
    },
  });

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setRejectError('El motivo de rechazo es obligatorio.');
      return;
    }
    if (!rejectingReq) return;
    rejectMutation.mutate({ id: rejectingReq.id, reason: rejectionReason });
  };

  const pending = requests.filter((r) => r.status === 'pendiente').length;
  const generated = requests.filter((r) => r.status === 'generada').length;
  const rejected = requests.filter((r) => r.status === 'rechazada').length;

  const filtered = activeTab === 'todos' ? requests : requests.filter((r) => r.status === activeTab);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Solicitudes de Credencial</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Aprueba o rechaza las solicitudes de credencial de tus programas asignados.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: requests.length, color: 'var(--text-primary)' },
          { label: 'Pendientes', value: pending, color: 'var(--color-warning)' },
          { label: 'Generadas', value: generated, color: 'var(--color-success)' },
          { label: 'Rechazadas', value: rejected, color: 'var(--color-danger)' },
        ].map((stat) => (
          <Card key={stat.label} className="text-center py-3">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Tab filters */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <nav className="flex gap-1">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'todos'
              ? requests.length
              : requests.filter((r) => r.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="py-2.5 px-4 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: activeTab === tab.key ? '#6366f1' : 'transparent',
                  color: activeTab === tab.key ? '#6366f1' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: activeTab === tab.key ? '#eef2ff' : 'var(--bg-surface-2)',
                      color: activeTab === tab.key ? '#6366f1' : 'var(--text-muted)',
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

      {/* Modal de rechazo */}
      <Modal isOpen={!!rejectingReq} onClose={() => { setRejectingReq(null); setRejectionReason(''); setRejectError(''); }} maxWidth="xl">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rechazar solicitud</h2>
          <button
            onClick={() => { setRejectingReq(null); setRejectionReason(''); setRejectError(''); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {rejectingReq && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Alumno: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rejectingReq.student_name}</span>
            </p>
          )}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Razones predefinidas
            </p>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                  style={{
                    borderColor: rejectionReason === reason ? '#6366f1' : 'var(--border)',
                    background: rejectionReason === reason ? '#eef2ff' : 'var(--bg-surface-2)',
                    color: rejectionReason === reason ? '#6366f1' : 'var(--text-secondary)',
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Motivo de rechazo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Describe el motivo del rechazo..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-700 dark:text-gray-100"
            />
            {rejectError && <p className="text-xs text-red-600 mt-1">{rejectError}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleConfirmReject} isLoading={rejectMutation.isPending}>
              Confirmar Rechazo
            </Button>
            <Button variant="secondary" onClick={() => { setRejectingReq(null); setRejectionReason(''); setRejectError(''); }}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Award className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin solicitudes</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">No hay solicitudes en esta categoría.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card
              key={req.id}
              className={req.status === 'pendiente' ? 'border-l-4 border-yellow-400' : 'opacity-90'}
            >
              <div className="flex gap-4">
                {/* Foto */}
                {req.photo_url ? (
                  <img
                    src={req.photo_url}
                    alt={req.student_name}
                    className="w-16 h-20 object-cover rounded-lg border flex-shrink-0"
                    style={{ borderColor: 'var(--border)' }}
                  />
                ) : (
                  <div
                    className="w-16 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-surface-2)' }}
                  >
                    <User size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{req.student_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {req.matricula} — {req.program_name} ({req.program_code})
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Periodo: {req.period_name} · Convocatoria: {req.convocatoria_title}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(req.status)}>{req.status_display}</Badge>
                  </div>

                  {req.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      <span className="font-medium">Motivo:</span> {req.rejection_reason}
                    </p>
                  )}

                  {req.status === 'pendiente' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          if (window.confirm(`¿Aprobar y generar la credencial de ${req.student_name}?`)) {
                            approveMutation.mutate(req.id);
                          }
                        }}
                        isLoading={approveMutation.isPending}
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Aprobar y Generar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setRejectingReq(req);
                          setRejectionReason('');
                          setRejectError('');
                        }}
                      >
                        <XCircle size={14} className="mr-1" />
                        Rechazar
                      </Button>
                    </div>
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
