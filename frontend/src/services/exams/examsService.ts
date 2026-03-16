import axios from '../api/axios';
import type {
  ExamSession,
  ExamSessionDetail,
  ExamAspirant,
  AspirantCount,
  PaginatedResponse,
} from '@/types';

export const examsService = {
  // Listar sesiones de examen
  async getSessions(params?: {
    page?: number;
    status?: string;
    period?: number;
    search?: string;
  }): Promise<PaginatedResponse<ExamSession>> {
    const response = await axios.get('/exams/sessions/', { params });
    return response.data;
  },

  // Detalle de sesión con venues
  async getSession(id: string): Promise<ExamSessionDetail> {
    const response = await axios.get(`/exams/sessions/${id}/`);
    return response.data;
  },

  // Crear sesión con venues
  async createSession(data: {
    name: string;
    period: number;
    exam_date: string;
    exam_time: string;
    mode: 'presencial' | 'en_linea';
    exam_type: 'propio' | 'cenaval';
    passing_score: number;
    venues: Array<{
      program: number;
      building: string;
      room: string;
      capacity: number;
    }>;
  }): Promise<ExamSessionDetail> {
    const response = await axios.post('/exams/sessions/', data);
    return response.data;
  },

  // Publicar sesión (dispara asignación en segundo plano)
  async publishSession(id: string): Promise<{ message: string; session_id: string }> {
    const response = await axios.post(`/exams/sessions/${id}/publish/`);
    return response.data;
  },

  // Lista de aspirantes asignados para calificación
  async getAspirants(sessionId: string): Promise<ExamAspirant[]> {
    const response = await axios.get(`/exams/sessions/${sessionId}/aspirants/`);
    return response.data;
  },

  // Calificar aspirante
  async gradeAspirant(
    sessionId: string,
    preEnrollmentId: string,
    data: { attended: boolean; exam_score?: number | null }
  ): Promise<{ message: string; status: string; exam_score: string | null }> {
    const response = await axios.post(
      `/exams/sessions/${sessionId}/grade/${preEnrollmentId}/`,
      data
    );
    return response.data;
  },

  // Conteo de aspirantes por programa (para contador en tiempo real del formulario)
  async getAspirantCounts(periodId: number): Promise<AspirantCount[]> {
    const response = await axios.get('/exams/sessions/aspirant-counts/', {
      params: { period: periodId },
    });
    return response.data;
  },
};
