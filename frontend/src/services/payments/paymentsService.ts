import axios from '../api/axios';
import type { Payment, PaymentDetail, PaginatedResponse } from '@/types';

export const paymentsService = {
  // Listar pagos
  async getPayments(params?: {
    page?: number;
    status?: string;
    payment_type?: string;
    pre_enrollment?: string;
    search?: string;
  }): Promise<PaginatedResponse<Payment>> {
    const response = await axios.get('/pre-enrollments/payments/', { params });
    return response.data;
  },

  // Obtener el pago asociado a una pre-inscripción, opcionalmente filtrado por tipo
  async getPaymentForPreEnrollment(
    preEnrollmentId: string,
    paymentType?: string,
  ): Promise<Payment | null> {
    const params: Record<string, string> = { pre_enrollment: preEnrollmentId };
    if (paymentType) params.payment_type = paymentType;
    const response = await axios.get('/pre-enrollments/payments/', { params });
    const data = response.data;
    const results: Payment[] = Array.isArray(data) ? data : data.results ?? [];
    return results[0] ?? null;
  },

  // Ver detalle de pago
  async getPayment(id: string): Promise<PaymentDetail> {
    const response = await axios.get(`/pre-enrollments/payments/${id}/`);
    return response.data;
  },

  // Crear ficha de pago (aspirante)
  async createPayment(data: {
    payment_type: string;
    pre_enrollment: string;
  }): Promise<PaymentDetail> {
    const response = await axios.post('/pre-enrollments/payments/', data);
    return response.data;
  },

  // Descargar ficha de pago en PDF
  async downloadSlip(id: string): Promise<Blob> {
    const response = await axios.get(`/pre-enrollments/payments/${id}/download-slip/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Descargar recibo oficial en PDF (solo pagos validados)
  async downloadReceipt(id: string): Promise<Blob> {
    const response = await axios.get(`/pre-enrollments/payments/${id}/download-receipt/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Subir comprobante de pago (aspirante)
  async uploadReceipt(id: string, formData: FormData): Promise<PaymentDetail> {
    const response = await axios.post(
      `/pre-enrollments/payments/${id}/upload-receipt/`,
      formData,
      { headers: { 'Content-Type': undefined } }
    );
    return response.data;
  },

  // Validar pago (finanzas)
  async validatePayment(id: string, notes?: string): Promise<void> {
    await axios.post(`/pre-enrollments/payments/${id}/validate/`, { notes });
  },

  // Rechazar pago (finanzas)
  async rejectPayment(id: string, notes: string): Promise<void> {
    await axios.post(`/pre-enrollments/payments/${id}/reject/`, { notes });
  },

  // Estadísticas
  async getStats(): Promise<{
    total: number;
    pending: number;
    validated: number;
    rejected: number;
    total_amount: string;
    pending_amount: string;
    by_payment_type?: Record<string, number>;
  }> {
    const response = await axios.get('/pre-enrollments/payments/stats/');
    return response.data;
  },
};