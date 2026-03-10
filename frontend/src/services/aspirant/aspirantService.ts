import axios from '../api/axios';
import type { MyApplication, Document, Announcement } from '@/types';

export const aspirantService = {
  async getMyApplication(): Promise<MyApplication | null> {
    const response = await axios.get('/pre-enrollments/pre-enrollments/my-applications/');
    const applications = Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
    return applications[0] ?? null;
  },

  async createApplication(data: {
    program: number;
    period: number;
  }): Promise<MyApplication> {
    const response = await axios.post('/pre-enrollments/pre-enrollments/', data);
    return response.data;
  },

  async submitApplication(id: string): Promise<void> {
    await axios.post(`/pre-enrollments/pre-enrollments/${id}/submit/`);
  },

  async uploadDocument(preEnrollmentId: string, data: FormData): Promise<Document> {
    const response = await axios.post(
      `/pre-enrollments/pre-enrollments/${preEnrollmentId}/upload-document/`,
      data,
      { headers: { 'Content-Type': undefined } }
    );
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await axios.delete(`/pre-enrollments/documents/${documentId}/`);
  },

  async getAvailablePrograms(): Promise<any[]> {
    const response = await axios.get('/academic/programs/', {
      params: { is_active: true },
    });
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  async getActivePeriods(): Promise<any[]> {
    const response = await axios.get('/academic/periods/', {
      params: { is_active: true },
    });
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  async getOpenAnnouncements(): Promise<Announcement[]> {
    const response = await axios.get('/pre-enrollments/announcements/open/');
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },
};
