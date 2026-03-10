import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import type { PaymentDetail } from '@/types';
import { paymentsService } from '@/services/payments/paymentsService';
import {
  X,
  User,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  CreditCard,
} from 'lucide-react';

interface PaymentValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentDetail | null;
}

export const PaymentValidationModal = ({
  isOpen,
  onClose,
  payment,
}: PaymentValidationModalProps) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const validateMutation = useMutation({
    mutationFn: (notes?: string) =>
      paymentsService.validatePayment(payment?.id ?? '', notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-stats'] });
      alert('Pago validado correctamente');
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Error al validar el pago');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (notes: string) =>
      paymentsService.rejectPayment(payment?.id ?? '', notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-stats'] });
      alert('Pago rechazado');
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Error al rechazar el pago');
    },
  });

  if (!isOpen || !payment) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
      pending: { variant: 'warning', label: 'Pendiente' },
      validated: { variant: 'success', label: 'Validado' },
      rejected: { variant: 'danger', label: 'Rechazado' },
    };
    const config = variants[status] || { variant: 'warning', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(parseFloat(amount));
  };

  const handleValidate = () => {
    if (window.confirm('¿Estás seguro de validar este pago?')) {
      validateMutation.mutate(notes);
    }
  };

  const handleReject = () => {
    if (!notes.trim()) {
      alert('Por favor ingresa una nota explicando el motivo del rechazo');
      return;
    }
    if (window.confirm('¿Estás seguro de rechazar este pago?')) {
      rejectMutation.mutate(notes);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>

        <div className="relative bg-white rounded-lg max-w-3xl w-full shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Validación de Pago
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Comprobante #{payment.receipt_number}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(payment.status)}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Información del Pago */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detalles del Pago
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <DollarSign className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Monto</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatAmount(payment.amount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CreditCard className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Pago</p>
                    <p className="font-medium text-gray-900">
                      {payment.payment_type_display}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Pago</p>
                    <p className="font-medium text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FileText className="text-gray-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">No. de Recibo</p>
                    <p className="font-medium text-gray-900">{payment.receipt_number}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Aspirante */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información del Aspirante
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <User className="text-blue-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-blue-700">Nombre</p>
                    <p className="font-medium text-blue-900">
                      {payment.pre_enrollment_detail.student.first_name}{' '}
                      {payment.pre_enrollment_detail.student.last_name}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-blue-700">CURP</p>
                  <p className="font-medium text-blue-900">{payment.student_curp}</p>
                </div>

                <div>
                  <p className="text-sm text-blue-700">Email</p>
                  <p className="font-medium text-blue-900">
                    {payment.pre_enrollment_detail.student.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-blue-700">Teléfono</p>
                  <p className="font-medium text-blue-900">
                    {payment.pre_enrollment_detail.student.phone}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-blue-700">Programa</p>
                  <p className="font-medium text-blue-900">
                    {payment.pre_enrollment_detail.program.code} -{' '}
                    {payment.pre_enrollment_detail.program.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Comprobante de Pago */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comprobante de Pago
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-sm text-gray-600 mb-4">
                  Archivo subido el{' '}
                  {new Date(payment.created_at).toLocaleDateString('es-MX')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open(payment.receipt_file, '_blank')}
                >
                  <Download size={16} className="mr-2" />
                  Descargar Comprobante
                </Button>
              </div>
            </div>

            {/* Información de Validación (si ya fue validado/rechazado) */}
            {payment.status !== 'pending' && (
              <div
                className={`p-4 rounded-lg ${
                  payment.status === 'validated'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <h4
                  className={`font-semibold mb-2 ${
                    payment.status === 'validated' ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {payment.status === 'validated' ? 'Pago Validado' : 'Pago Rechazado'}
                </h4>
                <div className="space-y-2">
                  <p
                    className={`text-sm ${
                      payment.status === 'validated' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    Por: {payment.validated_by_email}
                  </p>
                  <p
                    className={`text-sm ${
                      payment.status === 'validated' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    Fecha:{' '}
                    {payment.validated_at &&
                      new Date(payment.validated_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </p>
                  {payment.validation_notes && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Notas:</p>
                      <p className="text-sm">{payment.validation_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones de Validación (solo si está pendiente) */}
            {payment.status === 'pending' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Validar Comprobante de Pago
                </h4>
                <textarea
                  placeholder="Notas sobre la validación (opcional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                  rows={3}
                />
                <div className="flex space-x-3">
                  <Button
                    variant="success"
                    onClick={handleValidate}
                    isLoading={validateMutation.isPending}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Validar Pago
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleReject}
                    isLoading={rejectMutation.isPending}
                  >
                    <XCircle size={16} className="mr-2" />
                    Rechazar Pago
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};