import axios from '../api/axios';
import type { LoginCredentials, AuthTokens, User, RegisterData, CurpLookupResult } from '@/types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await axios.post('/users/login/', credentials);

    // El backend devuelve { message, user, tokens }
    return {
      user: response.data.user,
      tokens: response.data.tokens,
    };
  },

  async logout(refreshToken: string): Promise<void> {
    await axios.post('/users/logout/', { refresh: refreshToken });
  },

  async getProfile(): Promise<User> {
    const response = await axios.get('/users/me/');
    return response.data;
  },

  async register(data: RegisterData): Promise<{ message: string; email: string; email_sent: boolean }> {
    const response = await axios.post('/users/register/', data);
    return response.data;
  },

  async checkEmail(email: string): Promise<{ available: boolean }> {
    const response = await axios.post('/users/check-email/', { email });
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ message: string; user: unknown; tokens: { access: string; refresh: string } }> {
    const response = await axios.post('/users/verify-email/', { token });
    return response.data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await axios.post('/users/resend-verification/', { email });
    return response.data;
  },

  async lookupCurp(curp: string): Promise<CurpLookupResult> {
    const response = await axios.get(`/users/curp-lookup/?curp=${encodeURIComponent(curp)}`);
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await axios.post('/users/forgot-password/', { email });
    return response.data;
  },

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    const response = await axios.post('/users/reset-password/', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return response.data;
  },
};