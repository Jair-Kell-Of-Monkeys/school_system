import axios from '../api/axios';
import type { PreEnrollment, PreEnrollmentDetail, PaginatedResponse } from '@/types';

export const preEnrollmentsService = {
  // Listar pre-inscripciones
  async getPreEnrollments(params?: {
    page?: number;
    status?: string;
    program?: string;
    period?: string;
    search?: string;
  }): Promise<PaginatedResponse<PreEnrollment>> {
    const response = await axios.get('/pre-enrollments/pre-enrollments/', { params });
    return response.data;
  },

  // Ver detalle (retorna PreEnrollmentDetail con más información)
  async getPreEnrollment(id: string): Promise<PreEnrollmentDetail> {
    const response = await axios.get(`/pre-enrollments/pre-enrollments/${id}/`);
    return response.data;
  },

  // Aprobar o rechazar un documento individual
  async reviewDocument(
    documentId: string,
    action: 'approve' | 'reject',
    reviewer_notes: string = '',
  ): Promise<void> {
    await axios.post(`/pre-enrollments/documents/${documentId}/review/`, {
      action,
      reviewer_notes,
    });
  },

  // Revisar documentos (estado global de la pre-inscripción)
  async reviewDocuments(id: string, action: 'approve' | 'reject', notes?: string): Promise<void> {
    await axios.post(`/pre-enrollments/pre-enrollments/${id}/review/`, {
      new_status: action === 'approve' ? 'documents_approved' : 'documents_rejected',
      notes,
    });
  },

  // Programar examen
  async scheduleExam(id: string, data: {
    exam_date: string;
    exam_mode: 'presencial' | 'en_linea';
    exam_location: string;
  }): Promise<void> {
    await axios.post(`/pre-enrollments/pre-enrollments/${id}/schedule-exam/`, data);
  },

  // Ingresar calificación
  async enterScore(id: string, score: number, notes?: string): Promise<void> {
    await axios.post(`/pre-enrollments/pre-enrollments/${id}/enter-score/`, {
      exam_score: score,
      notes,
    });
  },

  // Aceptar aspirante
  async accept(id: string): Promise<void> {
    await axios.post(`/pre-enrollments/pre-enrollments/${id}/accept/`);
  },

  // Rechazar aspirante
  async reject(id: string, notes: string): Promise<void> {
    await axios.post(`/pre-enrollments/pre-enrollments/${id}/reject/`, { notes });
  },

  // Estadísticas
  async getStats(): Promise<any> {
    const response = await axios.get('/pre-enrollments/pre-enrollments/stats/');
    return response.data;
  },
};