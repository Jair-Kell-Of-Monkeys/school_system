import axios from '../api/axios';
import type { AcademicPeriod } from '@/types';

export const academicService = {
  async getPeriods(): Promise<AcademicPeriod[]> {
    const response = await axios.get('/academic/periods/');
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  async createPeriod(data: {
    name: string;
    start_date: string;
    end_date: string;
    enrollment_start: string;
    enrollment_end: string;
  }): Promise<AcademicPeriod> {
    const response = await axios.post('/academic/periods/', data);
    return response.data;
  },

  async updatePeriod(id: number, data: {
    name?: string;
    start_date?: string;
    end_date?: string;
    enrollment_start?: string;
    enrollment_end?: string;
  }): Promise<AcademicPeriod> {
    const response = await axios.patch(`/academic/periods/${id}/`, data);
    return response.data;
  },

  async activatePeriod(id: number): Promise<void> {
    await axios.post(`/academic/periods/${id}/activate/`);
  },
};
