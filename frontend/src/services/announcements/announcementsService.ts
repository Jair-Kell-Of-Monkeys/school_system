import axios from '../api/axios';
import type { Announcement } from '@/types';

export const announcementsService = {
  async getAnnouncements(): Promise<Announcement[]> {
    const response = await axios.get('/pre-enrollments/announcements/');
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  async createAnnouncement(data: {
    title: string;
    description?: string;
    period: number;
    deadline: string;
    is_active: boolean;
  }): Promise<Announcement> {
    const response = await axios.post('/pre-enrollments/announcements/', data);
    return response.data;
  },

  async updateAnnouncement(id: number, data: {
    title?: string;
    description?: string;
    period?: number;
    deadline?: string;
    is_active?: boolean;
  }): Promise<Announcement> {
    const response = await axios.patch(`/pre-enrollments/announcements/${id}/`, data);
    return response.data;
  },
};
