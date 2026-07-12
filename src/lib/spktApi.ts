import type {
  Report,
  LetterRequest,
  Complaint,
  Officer,
  ReportStatus,
  LetterStatus,
  ComplaintStatus,
  ComplaintCategory,
} from '@/lib/types/spkt';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(!(options?.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options?.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Terjadi kesalahan pada server');
  }

  return data as T;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'petugas' | 'admin';
    nik?: string;
    phone?: string;
    avatarUrl?: string;
  };
}

export interface CreateReportPayload {
  reporterUserId?: string;
  reporterName: string;
  reporterNIK: string;
  reporterPhone: string;
  caseType: string;
  incidentDate: string;
  location: string;
  description: string;
  status?: ReportStatus;
  evidenceFiles?: string[];
}

export interface UpdateReportPayload {
  status?: ReportStatus;
  assignedTo?: string;
  assignedOfficerId?: string;
  assignedBy?: string;
  notes?: string;
  timelineNote?: string;
  timelineOfficer?: string;
  adminOverride?: boolean;
}

export interface CreateLetterPayload {
  requesterUserId?: string;
  requesterName: string;
  requesterNIK: string;
  requesterPhone?: string;
  letterTypeId: string;
  letterTypeName: string;
  purpose: string;
  pickupDate?: string;
  attachmentFiles?: string[];
  status?: LetterStatus;
}

export interface UpdateLetterPayload {
  status?: LetterStatus;
  pickupDate?: string | null;
  rejectionReason?: string | null;
  assignedOfficerId?: string | null;
  assignedTo?: string;
  purpose?: string;
  requesterPhone?: string;
  attachmentFiles?: string[];
  submit?: boolean;
  letterTypeId?: string;
  letterTypeName?: string;
  timelineNote?: string;
}

export interface UpdateUserReportPayload {
  caseType?: string;
  incidentDate?: string;
  location?: string;
  description?: string;
  reporterPhone?: string;
  evidenceFiles?: string[];
  submit?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  nik: string;
  phone: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface UserPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  reportUpdate: boolean;
  letterReady: boolean;
  systemNews: boolean;
  publicProfile: boolean;
  activityHistory: boolean;
}

export interface InfoArticle {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  date: string;
}

export interface CreateComplaintPayload {
  submitterUserId?: string;
  submitterName: string;
  submitterNik?: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  files?: string[];
}

export interface UpdateComplaintPayload {
  status?: ComplaintStatus;
  response?: string;
  assignedOfficerId?: string | null;
  assignedTo?: string;
  timelineNote?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export const spktApi = {
  getSession: () => request<{ user: LoginResponse['user'] | null }>('/auth/session'),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  login: (email: string, password: string) =>
    request<LoginResponse | { requires2fa: true; tempToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verify2fa: (tempToken: string, code: string) =>
    request<LoginResponse>('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),

  forgotPassword: (email: string, nik: string, newPassword: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, nik, newPassword }),
    }),

  register: (payload: RegisterPayload) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProfile: () =>
    request<{ user: LoginResponse['user'] & { address?: string; avatarUrl?: string } }>('/users/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    request<{ user: LoginResponse['user'] & { address?: string; avatarUrl?: string } }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  exportMyData: async () => {
    const response = await fetch('/api/users/me/export', { credentials: 'same-origin' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Gagal mengunduh data');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `spkt-data-export.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  deleteAccount: (password: string) =>
    request<{ message: string }>('/users/me/export', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getTotpStatus: () => request<{ enabled: boolean; hasSecret: boolean }>('/users/me/totp'),

  setupTotp: () =>
    request<{ secret: string; uri: string; message: string }>('/users/me/totp', {
      method: 'POST',
      body: JSON.stringify({ action: 'setup' }),
    }),

  enableTotp: (code: string) =>
    request<{ message: string; enabled: boolean }>('/users/me/totp', {
      method: 'POST',
      body: JSON.stringify({ action: 'enable', code }),
    }),

  disableTotp: (code: string) =>
    request<{ message: string; enabled: boolean }>('/users/me/totp', {
      method: 'POST',
      body: JSON.stringify({ action: 'disable', code }),
    }),

  getAuditLogs: (page = 1, limit = 20) =>
    request<{ logs: AuditLogItem[]; pagination: PaginatedMeta }>(
      `/audit-logs?page=${page}&limit=${limit}`,
    ),

  updateUser: (id: string, payload: { name?: string; email?: string; role?: string; active?: boolean }) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getReports: (params?: { nik?: string; assignedTo?: string; assignedOfficerId?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.nik) search.set('nik', params.nik);
    if (params?.assignedTo) search.set('assignedTo', params.assignedTo);
    if (params?.assignedOfficerId) search.set('assignedOfficerId', params.assignedOfficerId);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return request<{ reports: Report[]; pagination?: PaginatedMeta }>(`/reports${qs ? `?${qs}` : ''}`);
  },

  getReport: (id: string) => request<{ report: Report }>(`/reports/${id}`),

  createReport: (payload: CreateReportPayload) =>
    request<{ report: Report }>('/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAllReports: () =>
    request<{ message: string; deleted: number }>('/reports', {
      method: 'DELETE',
    }),

  updateReport: (id: string, payload: UpdateReportPayload) =>
    request<{ report: Report }>(`/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateUserReport: (id: string, payload: UpdateUserReportPayload) =>
    request<{ report: Report }>(`/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteUserReport: (id: string) =>
    request<{ message: string }>(`/reports/${id}`, {
      method: 'DELETE',
    }),

  getLetters: (params?: { nik?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.nik) search.set('nik', params.nik);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return request<{ letters: LetterRequest[]; pagination?: PaginatedMeta }>(`/letters${qs ? `?${qs}` : ''}`);
  },

  createLetter: (payload: CreateLetterPayload) =>
    request<{ letter: LetterRequest }>('/letters', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getLetter: (id: string) => request<{ letter: LetterRequest }>(`/letters/${id}`),

  updateLetter: (id: string, payload: UpdateLetterPayload) =>
    request<{ letter: LetterRequest }>(`/letters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getComplaints: (params?: { nik?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.nik) search.set('nik', params.nik);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return request<{ complaints: Complaint[]; pagination?: PaginatedMeta }>(`/complaints${qs ? `?${qs}` : ''}`);
  },

  createComplaint: (payload: CreateComplaintPayload) =>
    request<{ complaint: Complaint }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getComplaint: (id: string) => request<{ complaint: Complaint }>(`/complaints/${id}`),

  updateComplaint: (id: string, payload: UpdateComplaintPayload) =>
    request<{ complaint: Complaint }>(`/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getOfficers: () => request<{ officers: Officer[] }>('/officers'),

  getUsers: (page = 1, limit = 50) =>
    request<{
      users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        active: boolean;
        nik?: string;
        phone?: string;
      }>;
    }>(`/users?page=${page}&limit=${limit}`),

  getAdminStats: () =>
    request<{
      stats: {
        totalReports: number;
        completedReports: number;
        processingReports: number;
        completionRate: number;
        reportsToday: number;
        avgCompletionDays: number;
        activeUsers: number;
        monthlyTrend: Array<{ month: string; laporan: number; selesai: number }>;
        responseTimeBuckets: Array<{ category: string; count: number }>;
        caseDistribution: Array<{ name: string; value: number }>;
      };
    }>('/stats/admin'),

  getNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications'),

  markNotificationRead: (id: string) =>
    request<{ message: string }>(`/notifications/${id}`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    request<{ message: string }>('/notifications', { method: 'PATCH' }),

  createOfficer: (payload: {
    name: string;
    rank: string;
    email: string;
    phone: string;
    status?: string;
    division?: string;
    userId?: string;
  }) =>
    request<{ message: string }>('/officers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateOfficer: (
    id: string,
    payload: Partial<{ name: string; rank: string; email: string; phone: string; status: string; division: string; userId: string | null }>,
  ) =>
    request<{ message: string }>(`/officers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteOfficer: (id: string) =>
    request<{ message: string }>(`/officers/${id}`, {
      method: 'DELETE',
    }),

  uploadFiles: (files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return request<{
      files: Array<{ storedName: string; originalName: string; size: number; mimeType: string }>;
    }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  getFileUrl: (storedName: string) => `/api/files/${encodeURIComponent(storedName)}`,

  getPreferences: () => request<{ preferences: UserPreferences }>('/users/me/preferences'),

  updatePreferences: (payload: Partial<UserPreferences>) =>
    request<{ preferences: UserPreferences }>('/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getInfoArticles: () => request<{ articles: InfoArticle[] }>('/info/articles'),

  createInfoArticle: (payload: Omit<InfoArticle, 'id' | 'date'> & { content: string }) =>
    request<{ article: InfoArticle }>('/info/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateInfoArticle: (id: string, payload: Partial<Omit<InfoArticle, 'id' | 'date'>>) =>
    request<{ article: InfoArticle }>(`/info/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteInfoArticle: (id: string) =>
    request<{ message: string }>(`/info/articles/${id}`, { method: 'DELETE' }),

  getLetterPdfUrl: (id: string) => `/api/letters/${id}/pdf`,

  suspendUserByNik: async (nik: string) => {
    const { users } = await request<{ users: Array<{ id: string; nik?: string }> }>('/users');
    const target = users.find((u) => u.nik === nik);
    if (!target) {
      throw new Error('Akun pelapor tidak ditemukan');
    }
    return request<{ message: string }>(`/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
  },
};

