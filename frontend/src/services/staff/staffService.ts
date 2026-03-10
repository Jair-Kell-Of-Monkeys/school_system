import axios from '../api/axios';
import type { StaffUser, AcademicProgram } from '@/types';

export const staffService = {
  // Listar encargados
  async getStaffList(): Promise<StaffUser[]> {
    const response = await axios.get('/users/servicios-escolares-staff/');
    return response.data;
  },

  // Ver detalle de un encargado
  async getStaffDetail(id: string): Promise<StaffUser> {
    const response = await axios.get(`/users/servicios-escolares-staff/${id}/`);
    return response.data;
  },

  // Asignar programas a un encargado
  async assignPrograms(userId: string, programIds: number[]): Promise<StaffUser> {
    const response = await axios.post('/users/servicios-escolares-staff/assign-programs/', {
      user_id: userId,
      program_ids: programIds,
    });
    return response.data.user;
  },

  // Agregar un programa
  async addProgram(userId: string, programId: number): Promise<void> {
    await axios.post(`/users/servicios-escolares-staff/${userId}/add-program/`, {
      program_id: programId,
    });
  },

  // Remover un programa
  async removeProgram(userId: string, programId: number): Promise<void> {
    await axios.post(`/users/servicios-escolares-staff/${userId}/remove-program/`, {
      program_id: programId,
    });
  },

  // Obtener programas disponibles - ARREGLADO
  async getAvailablePrograms(): Promise<AcademicProgram[]> {
    const response = await axios.get('/academic/programs/');
    // Si viene paginado, extraer results, si no, devolver directamente
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  // Estadísticas
  async getStats(): Promise<{
    total_encargados: number;
    encargados_sin_programas: number;
    programas_sin_encargado: number;
  }> {
    const response = await axios.get('/users/servicios-escolares-staff/stats/');
    return response.data;
  },
};