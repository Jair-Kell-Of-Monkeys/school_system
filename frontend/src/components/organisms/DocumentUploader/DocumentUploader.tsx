import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button/Button';
import type { MyApplication } from '@/types';
import { aspirantService } from '@/services/aspirant/aspirantService';
import {
  Upload, FileText, Trash2, Download,
  CheckCircle, XCircle, Clock, AlertCircle,
} from 'lucide-react';

interface DocumentUploaderProps {
  application: MyApplication;
}

const DOCUMENT_TYPES = [
  { value: 'acta_nacimiento',      label: 'Acta de Nacimiento' },
  { value: 'curp',                 label: 'CURP' },
  { value: 'comprobante_domicilio',label: 'Comprobante de Domicilio' },
  { value: 'certificado_estudios', label: 'Certificado de Estudios' },
  { value: 'fotografia',           label: 'Fotografía' },
];

const STATUS_CONFIG = {
  approved: {
    icon: CheckCircle,
    color: '#22c55e',
    bg: 'var(--color-success-bg)',
    border: 'var(--color-success-border)',
    label: 'Aprobado',
  },
  rejected: {
    icon: XCircle,
    color: '#ef4444',
    bg: 'var(--color-danger-bg)',
    border: 'var(--color-danger-border)',
    label: 'Rechazado',
  },
  pending: {
    icon: Clock,
    color: '#f59e0b',
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
    label: 'Pendiente',
  },
} as const;

export const DocumentUploader = ({ application }: DocumentUploaderProps) => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reuploadDocId, setReuploadDocId] = useState<string | null>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: string; file: File }) => {
      const formData = new FormData();
      formData.append('document_type', type);
      formData.append('file', file);
      return aspirantService.uploadDocument(application.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
      setSelectedType('');
      setSelectedFile(null);
      setReuploadDocId(null);
      setReuploadFile(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || error.response?.data?.error || 'Error al subir el documento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => aspirantService.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-application'] });
    },
  });

  const canUploadDocuments = ['draft', 'documents_rejected'].includes(application.status);

  return (
    <div className="space-y-4">

      {/* Document cards */}
      {application.documents && application.documents.length > 0 ? (
        <div className="space-y-3">
          {application.documents.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const isRejected = doc.status === 'rejected';
            const canDelete = canUploadDocuments && doc.status !== 'approved' && doc.status !== 'rejected';

            return (
              <div
                key={doc.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Status icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={18} style={{ color: cfg.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {doc.document_type_display}
                      </p>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Subido el {new Date(doc.uploaded_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.file_url && (
                      <button
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title="Ver documento"
                      >
                        <Download size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('¿Eliminar este documento?')) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#f87171' }}
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reviewer notes callout */}
                {doc.reviewer_notes && (
                  <div
                    className="mx-4 mb-4 rounded-lg p-3 flex gap-2.5"
                    style={{
                      background: isRejected ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                      border: `1px solid ${isRejected ? 'var(--color-danger-border)' : 'var(--color-warning-border)'}`,
                    }}
                  >
                    <AlertCircle
                      size={15}
                      className="shrink-0 mt-0.5"
                      style={{ color: isRejected ? '#ef4444' : '#f59e0b' }}
                    />
                    <div>
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: isRejected ? '#ef4444' : '#d97706' }}
                      >
                        Observación del encargado
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {doc.reviewer_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Re-upload section for rejected docs */}
                {isRejected && canUploadDocuments && (
                  <div
                    className="px-4 pb-4"
                  >
                    {reuploadDocId === doc.id ? (
                      <div
                        className="rounded-lg p-3 space-y-3"
                        style={{
                          background: 'var(--bg-surface-2)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setReuploadFile(e.target.files?.[0] ?? null)}
                          className="w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium cursor-pointer"
                          style={{ color: 'var(--text-secondary)' }}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              reuploadFile &&
                              uploadMutation.mutate({ type: doc.document_type, file: reuploadFile })
                            }
                            isLoading={uploadMutation.isPending}
                            disabled={!reuploadFile}
                          >
                            <Upload size={13} className="mr-1.5" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setReuploadDocId(null); setReuploadFile(null); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReuploadDocId(doc.id); setReuploadFile(null); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: 'var(--color-danger-bg)',
                          color: '#ef4444',
                          border: '1px solid var(--color-danger-border)',
                        }}
                      >
                        <Upload size={13} />
                        Volver a subir
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No has subido documentos aún
          </p>
        </div>
      )}

      {/* Upload form */}
      {canUploadDocuments && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            background: 'var(--color-info-bg)',
            border: '1px solid var(--color-info-border)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Subir Nuevo Documento
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Tipo de documento
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Selecciona un tipo…</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Archivo (PDF, JPG, PNG — máx. 5 MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium cursor-pointer"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              />
              {selectedFile && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {selectedFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={() => {
                if (!selectedType || !selectedFile) {
                  alert('Por favor selecciona el tipo de documento y un archivo');
                  return;
                }
                uploadMutation.mutate({ type: selectedType, file: selectedFile });
              }}
              isLoading={uploadMutation.isPending}
              disabled={!selectedType || !selectedFile}
            >
              <Upload size={15} className="mr-2" />
              Subir Documento
            </Button>
          </div>
        </div>
      )}

      {!canUploadDocuments && (
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No puedes subir documentos en este momento.{' '}
            Tu solicitud está en estado:{' '}
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {application.status_display}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
