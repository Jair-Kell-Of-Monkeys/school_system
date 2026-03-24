import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import type { Document, MyApplication } from '@/types';
import { aspirantService } from '@/services/aspirant/aspirantService';
import { Upload, FileText, Trash2, Download, CheckCircle, XCircle } from 'lucide-react';

interface DocumentUploaderProps {
  application: MyApplication;
} 

const DOCUMENT_TYPES = [
  { value: 'acta_nacimiento', label: 'Acta de Nacimiento' },
  { value: 'curp', label: 'CURP' },
  { value: 'comprobante_domicilio', label: 'Comprobante de Domicilio' },
  { value: 'certificado_estudios', label: 'Certificado de Estudios' },
  { value: 'fotografia', label: 'Fotografía' },
];

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
      alert('Documento eliminado');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedType || !selectedFile) {
      alert('Por favor selecciona el tipo de documento y un archivo');
      return;
    }
    uploadMutation.mutate({ type: selectedType, file: selectedFile });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
      pending: { variant: 'warning', label: 'Pendiente' },
      approved: { variant: 'success', label: 'Aprobado' },
      rejected: { variant: 'danger', label: 'Rechazado' },
    };
    const config = variants[status] || { variant: 'warning', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canUploadDocuments = ['draft', 'documents_rejected'].includes(application.status);

  return (
    <div className="space-y-6">
      {/* Lista de documentos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Documentos Requeridos
        </h3>
        <div className="space-y-3">
          {application.documents && application.documents.length > 0 ? (
            application.documents.map((doc) => (
              <div
                key={doc.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {/* Fila principal */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="text-gray-400" size={24} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {doc.document_type_display}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Subido: {new Date(doc.uploaded_at).toLocaleDateString('es-MX')}
                      </p>
                      {doc.reviewer_notes && (
                        <p className="text-sm text-amber-700 mt-1">
                          <span className="font-medium">Observación:</span>{' '}
                          {doc.reviewer_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(doc.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => doc.file_url && window.open(doc.file_url, '_blank')}
                    >
                      <Download size={16} />
                    </Button>
                    {canUploadDocuments && doc.status !== 'approved' && doc.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm('¿Eliminar este documento?')) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Re-subir documento rechazado */}
                {doc.status === 'rejected' && (
                  <div className="border-t border-red-100 px-4 pb-3 pt-3 bg-red-50 rounded-b-lg">
                    {reuploadDocId === doc.id ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setReuploadFile(e.target.files?.[0] ?? null)}
                          className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-100"
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              reuploadFile &&
                              uploadMutation.mutate({
                                type: doc.document_type,
                                file: reuploadFile,
                              })
                            }
                            isLoading={uploadMutation.isPending}
                            disabled={!reuploadFile}
                          >
                            <Upload size={14} className="mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReuploadDocId(null);
                              setReuploadFile(null);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReuploadDocId(doc.id);
                          setReuploadFile(null);
                        }}
                      >
                        <Upload size={14} className="mr-1" />
                        Re-subir documento
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">
              No has subido documentos aún
            </p>
          )}
        </div>
      </div>

      {/* Formulario de subida */}
      {canUploadDocuments && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Subir Nuevo Documento</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Documento
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Selecciona un tipo...</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Archivo (PDF, JPG, PNG - Máx. 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Seleccionado: {selectedFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              isLoading={uploadMutation.isPending}
              disabled={!selectedType || !selectedFile}
            >
              <Upload size={16} className="mr-2" />
              Subir Documento
            </Button>
          </div>
        </div>
      )}

      {!canUploadDocuments && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No puedes subir documentos en este momento. Tu solicitud está en estado:{' '}
            <span className="font-semibold">{application.status_display}</span>
          </p>
        </div>
      )}
    </div>
  );
};