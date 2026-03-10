import axios from '../api/axios';
import type { Student, PaginatedResponse } from '@/types';

export const studentsService = {
  // Listar estudiantes
  async getStudents(params?: {
    page?: number;
    search?: string;
    gender?: string;
    city?: string;
    photo_status?: string;
  }): Promise<PaginatedResponse<Student>> {
    const response = await axios.get('/students/', { params });
    return response.data;
  },

  // Ver detalle de estudiante
  async getStudent(id: string): Promise<Student> {
    const response = await axios.get(`/students/${id}/`);
    return response.data;
  },

  // Estadísticas
  async getStats(): Promise<any> {
    const response = await axios.get('/students/stats/');
    return response.data;
  },
};