import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { credentialsService, type CredentialRequest } from '@/services/credentials/credentialsService';
import { CheckCircle, XCircle, User, Award } from 'lucide-react';

const statusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' => {
  if (status === 'generada') return 'success';
  if (status === 'aprobada') return 'success';
  if (status === 'rechazada') return 'danger';
  return 'warning';
};

export const CredentialRequests = () => {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
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
      setRejectId(null);
      setRejectionReason('');
      setRejectError('');
    },
    onError: (err: any) => {
      setRejectError(err?.response?.data?.rejection_reason?.[0] || 'Error al rechazar.');
    },
  });

  const handleReject = (id: string) => {
    if (!rejectionReason.trim()) {
      setRejectError('El motivo de rechazo es obligatorio.');
      return;
    }
    rejectMutation.mutate({ id, reason: rejectionReason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pendiente');
  const reviewed = requests.filter((r) => r.status !== 'pendiente');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Credencial</h1>
        <p className="text-gray-600 mt-1">
          Aprueba o rechaza las solicitudes de credencial de tus programas asignados.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
          <p className="text-sm text-gray-600">Pendientes</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.status === 'generada').length}
          </p>
          <p className="text-sm text-gray-600">Generadas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {requests.filter((r) => r.status === 'rechazada').length}
          </p>
          <p className="text-sm text-gray-600">Rechazadas</p>
        </Card>
      </div>

      {/* Pendientes */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Pendientes de revisión</h2>
          <div className="space-y-4">
            {pending.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                rejectId={rejectId}
                rejectionReason={rejectionReason}
                rejectError={rejectError}
                onApprove={() => {
                  if (window.confirm(`¿Aprobar y generar la credencial de ${req.student_name}?`)) {
                    approveMutation.mutate(req.id);
                  }
                }}
                onStartReject={() => {
                  setRejectId(req.id);
                  setRejectionReason('');
                  setRejectError('');
                }}
                onCancelReject={() => {
                  setRejectId(null);
                  setRejectionReason('');
                  setRejectError('');
                }}
                onConfirmReject={() => handleReject(req.id)}
                onReasonChange={setRejectionReason}
                isApprovingThis={approveMutation.isPending}
                isRejectingThis={rejectMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Revisadas */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Revisadas</h2>
          <div className="space-y-3">
            {reviewed.map((req) => (
              <Card key={req.id} className="opacity-80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{req.student_name}</p>
                      <p className="text-sm text-gray-500">
                        {req.matricula} — {req.program_code}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(req.status)}>{req.status_display}</Badge>
                </div>
                {req.rejection_reason && (
                  <p className="text-sm text-red-600 mt-2 pl-8">
                    <span className="font-medium">Motivo:</span> {req.rejection_reason}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Award className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">Sin solicitudes</h3>
            <p className="text-gray-500 mt-1">
              Aún no hay solicitudes de credencial para tus programas.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

interface RequestCardProps {
  req: CredentialRequest;
  rejectId: string | null;
  rejectionReason: string;
  rejectError: string;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  onReasonChange: (v: string) => void;
  isApprovingThis: boolean;
  isRejectingThis: boolean;
}

const RequestCard = ({
  req,
  rejectId,
  rejectionReason,
  rejectError,
  onApprove,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onReasonChange,
  isApprovingThis,
  isRejectingThis,
}: RequestCardProps) => {
  const isRejectingThis2 = rejectId === req.id;

  return (
    <Card className="border-l-4 border-yellow-400">
      <div className="flex gap-4">
        {/* Foto */}
        {req.photo_url ? (
          <img
            src={req.photo_url}
            alt={req.student_name}
            className="w-16 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-gray-400" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{req.student_name}</h3>
              <p className="text-sm text-gray-600">
                {req.matricula} — {req.program_name} ({req.program_code})
              </p>
              <p className="text-sm text-gray-500">Periodo: {req.period_name}</p>
              <p className="text-xs text-gray-400 mt-1">
                Convocatoria: {req.convocatoria_title}
              </p>
            </div>
            <Badge variant="warning">Pendiente</Badge>
          </div>

          {!isRejectingThis2 && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="success"
                onClick={onApprove}
                isLoading={isApprovingThis}
              >
                <CheckCircle size={16} className="mr-1" />
                Aprobar y Generar
              </Button>
              <Button size="sm" variant="danger" onClick={onStartReject}>
                <XCircle size={16} className="mr-1" />
                Rechazar
              </Button>
            </div>
          )}

          {isRejectingThis2 && (
            <div className="mt-3 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Motivo de rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={2}
                placeholder="Describe el motivo del rechazo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {rejectError && <p className="text-xs text-red-600">{rejectError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={onConfirmReject}
                  isLoading={isRejectingThis}
                >
                  Confirmar Rechazo
                </Button>
                <Button size="sm" variant="secondary" onClick={onCancelReject}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
