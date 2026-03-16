import axios from '../api/axios';
import type { EnrollmentDetail, EnrollmentDocument, PaginatedResponse } from '@/types';

export const enrollmentsService = {
  // Mis inscripciones (alumno/aspirante)
  async getMyEnrollments(): Promise<EnrollmentDetail[]> {
    const response = await axios.get('/enrollments/enrollments/my-enrollment/');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data.results) return data.results as EnrollmentDetail[];
    return [data as EnrollmentDetail];
  },

  // Listar inscripciones (staff)
  async getEnrollments(params?: {
    page?: number;
    status?: string;
    program?: string;
    period?: string;
    search?: string;
  }): Promise<PaginatedResponse<EnrollmentDetail>> {
    const response = await axios.get('/enrollments/enrollments/', { params });
    return response.data;
  },

  // Detalle de inscripción
  async getEnrollment(id: string): Promise<EnrollmentDetail> {
    const response = await axios.get(`/enrollments/enrollments/${id}/`);
    return response.data;
  },

  // Subir documento de inscripción (alumno)
  async uploadDocument(enrollmentId: string, formData: FormData): Promise<EnrollmentDocument> {
    const response = await axios.post(
      `/enrollments/enrollments/${enrollmentId}/upload-document/`,
      formData,
      { headers: { 'Content-Type': undefined } }
    );
    return response.data;
  },

  // Revisar documento (staff)
  async reviewDocument(
    enrollmentId: string,
    documentId: string,
    action: 'approve' | 'reject',
    reviewer_notes: string = ''
  ): Promise<EnrollmentDocument> {
    const response = await axios.post(
      `/enrollments/enrollments/${enrollmentId}/review-document/${documentId}/`,
      { action, reviewer_notes }
    );
    return response.data.document;
  },

  // Confirmar inscripción asignando grupo y horario (staff)
  async confirmEnrollment(
    enrollmentId: string,
    data: { group: string; schedule: string }
  ): Promise<EnrollmentDetail> {
    const response = await axios.post(
      `/enrollments/enrollments/${enrollmentId}/confirm/`,
      data
    );
    return response.data.enrollment;
  },

  // Exportar CSV de inscripciones (solo jefe/admin)
  async exportCsv(): Promise<void> {
    const response = await axios.get('/enrollments/enrollments/export-csv/', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inscripciones.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Crear inscripción desde pre-inscripción aceptada (staff)
  async createEnrollment(
    preEnrollmentId: string,
    group?: string,
    schedule?: string
  ): Promise<EnrollmentDetail> {
    const response = await axios.post('/enrollments/enrollments/', {
      pre_enrollment_id: preEnrollmentId,
      group,
      schedule,
    });
    return response.data;
  },
};
