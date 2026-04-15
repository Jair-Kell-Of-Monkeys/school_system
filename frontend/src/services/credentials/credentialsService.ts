import api from '@/services/api/axios';

export interface CredentialConvocatoria {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  period: number;
  period_name: string;
  fecha_inicio: string;
  fecha_fin: string;
  status: string;
  status_display: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialRequest {
  id: string;
  convocatoria: string;
  convocatoria_title: string;
  enrollment: string;
  status: string;
  status_display: string;
  student_name: string;
  student_curp: string;
  matricula: string;
  program_name: string;
  program_code: string;
  period_name: string;
  photo_url: string | null;
  rejection_reason: string | null;
  credential_id: string | null;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  requested_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

export const credentialsService = {
  // ── Convocatorias ──────────────────────────────────────────────────────────

  getConvocatorias: async (params?: Record<string, string>): Promise<CredentialConvocatoria[]> => {
    const res = await api.get('/credentials/convocatorias/', { params });
    return res.data.results ?? res.data;
  },

  getConvocatoria: async (id: string): Promise<CredentialConvocatoria> => {
    const res = await api.get(`/credentials/convocatorias/${id}/`);
    return res.data;
  },

  createConvocatoria: async (data: {
    title: string;
    description?: string;
    requirements?: string;
    period: number;
    fecha_inicio: string;
    fecha_fin: string;
  }): Promise<CredentialConvocatoria> => {
    const res = await api.post('/credentials/convocatorias/', data);
    return res.data;
  },

  publishConvocatoria: async (id: string): Promise<CredentialConvocatoria> => {
    const res = await api.post(`/credentials/convocatorias/${id}/publish/`);
    return res.data;
  },

  closeConvocatoria: async (id: string): Promise<CredentialConvocatoria> => {
    const res = await api.post(`/credentials/convocatorias/${id}/close/`);
    return res.data;
  },

  // ── Requests ───────────────────────────────────────────────────────────────

  getRequests: async (params?: Record<string, string>): Promise<CredentialRequest[]> => {
    const res = await api.get('/credentials/requests/', { params });
    return res.data.results ?? res.data;
  },

  getMyRequests: async (): Promise<CredentialRequest[]> => {
    const res = await api.get('/credentials/requests/my-request/');
    return res.data;
  },

  createRequest: async (convocatoriaId: string): Promise<CredentialRequest> => {
    const res = await api.post('/credentials/requests/', { convocatoria: convocatoriaId });
    return res.data;
  },

  approveRequest: async (id: string): Promise<CredentialRequest> => {
    const res = await api.post(`/credentials/requests/${id}/approve/`);
    return res.data;
  },

  rejectRequest: async (id: string, rejection_reason: string): Promise<CredentialRequest> => {
    const res = await api.post(`/credentials/requests/${id}/reject/`, { rejection_reason });
    return res.data;
  },

  // ── Download credential PDF ────────────────────────────────────────────────

  downloadCredential: async (credentialId: string, matricula: string): Promise<void> => {
    // Step 1: authenticated call to get the Cloudinary URL
    const res = await api.get(`/credentials/${credentialId}/download/`);
    const pdfUrl: string = res.data.url;

    // Step 2: download the file via plain fetch (no JWT header) to avoid
    // Cloudinary rejecting the request with 401
    const fileRes = await fetch(pdfUrl);
    if (!fileRes.ok) throw new Error('No se pudo descargar el PDF de la credencial.');
    const blob = await fileRes.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `credencial-${matricula}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Verify (public) ───────────────────────────────────────────────────────

  verifyCredential: async (matricula: string) => {
    const res = await api.get(`/credentials/verify/${matricula}/`);
    return res.data;
  },
};
