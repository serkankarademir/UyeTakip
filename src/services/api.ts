import {
  Member,
  TeamEvent,
  Accreditation,
  DashboardReport,
  TeamPosition,
  EventType,
  AuditLog,
  User,
  ReportQueryParams,
  ReportQueryResult,
  SavedReport,
  BatchImportResult,
  BatchImportStrategy,
} from '../types/index.ts';

const API_BASE = '/api';

export const apiClient = {
  // Members
  async getMembers(params?: {
    search?: string;
    status?: string;
    position?: string;
    district?: string;
    branch?: string;
    srcCertificate?: string;
    srcCertificateType?: string;
  }): Promise<Member[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.position) query.append('position', params.position);
    if (params?.district) query.append('district', params.district);
    if (params?.branch) query.append('branch', params.branch);
    if (params?.srcCertificate) query.append('srcCertificate', params.srcCertificate);
    if (params?.srcCertificateType) query.append('srcCertificateType', params.srcCertificateType);

    const res = await fetch(`${API_BASE}/members?${query.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Üyeler alınamadı.');
    return res.json();
  },

  async getMemberById(id: number): Promise<Member> {
    const res = await fetch(`${API_BASE}/members/${id}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Üye bulunamadı.');
    return res.json();
  },

  async createMember(data: Partial<Member>): Promise<Member> {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Üye kaydedilemedi.');
    return result;
  },

  async updateMember(id: number, data: Partial<Member>): Promise<Member> {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Üye güncellenemedi.');
    return result;
  },

  async deleteMember(id: number, force: boolean = false): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/members/${id}?force=${force}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result.error || 'Üye silinemedi.') as any;
      err.hasRelations = result.hasRelations;
      err.eventCount = result.eventCount;
      throw err;
    }
    return result;
  },

  async batchImportMembers(
    members: any[],
    strategy: BatchImportStrategy,
    userRole: string = 'ADMIN'
  ): Promise<BatchImportResult> {
    const res = await fetch(`${API_BASE}/members/batch-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
      },
      body: JSON.stringify({ members, strategy }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Toplu üye aktarımı başarısız oldu.');
    return result;
  },

  // Events
  async getEvents(params?: {
    search?: string;
    type?: string;
    status?: string;
    district?: string;
  }): Promise<TeamEvent[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.district) query.append('district', params.district);

    const res = await fetch(`${API_BASE}/events?${query.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Etkinlikler alınamadı.');
    return res.json();
  },

  async getEventById(id: number): Promise<TeamEvent> {
    const res = await fetch(`${API_BASE}/events/${id}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Etkinlik bulunamadı.');
    return res.json();
  },

  async createEvent(data: Partial<TeamEvent>): Promise<TeamEvent> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Etkinlik kaydedilemedi.');
    return result;
  },

  async updateEvent(id: number, data: Partial<TeamEvent>): Promise<TeamEvent> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Etkinlik güncellenemedi.');
    return result;
  },

  async deleteEvent(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Etkinlik silinemedi.');
    return result;
  },

  async addParticipant(
    eventId: number,
    memberId: number,
    role: 'Ekip Sorumlusu' | 'Ekip Üyesi',
    notes?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/events/${eventId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role, notes }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Katılımcı eklenemedi.');
    return result;
  },

  async removeParticipant(eventId: number, memberId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/events/${eventId}/participants/${memberId}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Katılımcı çıkarılamadı.');
    return result;
  },

  // Accreditations
  async getAccreditations(): Promise<Accreditation[]> {
    const res = await fetch(`${API_BASE}/accreditations`);
    if (!res.ok) throw new Error('Akreditasyonlar alınamadı.');
    return res.json();
  },

  async createAccreditation(data: Partial<Accreditation>): Promise<Accreditation> {
    const res = await fetch(`${API_BASE}/accreditations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Akreditasyon oluşturulamadı.');
    return result;
  },

  async deleteAccreditation(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/accreditations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Silinemedi.');
  },

  // Reports
  async getReportSummary(): Promise<DashboardReport> {
    const res = await fetch(`${API_BASE}/reports/summary`);
    if (!res.ok) throw new Error('Rapor özeti alınamadı.');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{
    settings: Record<string, string>;
    positions: TeamPosition[];
    eventTypes: EventType[];
  }> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Ayarlar alınamadı.');
    return res.json();
  },

  async updateSetting(key: string, value: string): Promise<void> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Ayar kaydedilemedi.');
  },

  async addTeamPosition(name: string, description?: string): Promise<TeamPosition> {
    const res = await fetch(`${API_BASE}/team-positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Ekip görevi eklenemedi.');
    return result;
  },

  async deleteTeamPosition(id: number): Promise<void> {
    await fetch(`${API_BASE}/team-positions/${id}`, { method: 'DELETE' });
  },

  async addEventType(name: string, badgeColor: string, description?: string): Promise<EventType> {
    const res = await fetch(`${API_BASE}/event-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, badgeColor, description }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Etkinlik türü eklenemedi.');
    return result;
  },

  async deleteEventType(id: number): Promise<void> {
    await fetch(`${API_BASE}/event-types/${id}`, { method: 'DELETE' });
  },

  // Users & Audits
  async getUsers(): Promise<{ users: User[]; roles: any[] }> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Kullanıcılar alınamadı.');
    return res.json();
  },

  async updateUserRole(userId: number, role: string): Promise<any> {
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`);
    if (!res.ok) throw new Error('Denetim kayıtları alınamadı.');
    return res.json();
  },

  async exportBackup(): Promise<any> {
    const res = await fetch(`${API_BASE}/backup/export`);
    if (!res.ok) throw new Error('Yedekleme dosyası oluşturulamadı.');
    return res.json();
  },

  // Auth Methods (Bursa MEB AKUB)
  async login(email: string, password: string, rememberMe: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async register(payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async verifyEmail(token: string, email?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async resendVerification(email: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async forgotPassword(email: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async resetPassword(payload: {
    email?: string;
    token: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async approveUser(userId: number, payload: { role?: string; isApproved?: boolean; memberId?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/users/${userId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async linkUserMember(userId: number, memberId: number | null): Promise<any> {
    const res = await fetch(`${API_BASE}/users/${userId}/link-member`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async getEmailNotifications(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/email-notifications`);
    if (!res.ok) throw new Error('E-posta bildirimleri alınamadı.');
    return res.json();
  },

  // Dynamic Reporting Engine API
  async queryReport(params: ReportQueryParams, userRole?: string): Promise<ReportQueryResult> {
    const res = await fetch(`${API_BASE}/reports/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userRole ? { 'x-user-role': userRole } : {}),
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Rapor sorgusu başarısız oldu.');
    return data;
  },

  async getSavedReports(): Promise<SavedReport[]> {
    const res = await fetch(`${API_BASE}/reports/saved`);
    if (!res.ok) throw new Error('Kayıtlı raporlar alınamadı.');
    return res.json();
  },

  async createSavedReport(payload: Partial<SavedReport>): Promise<SavedReport> {
    const res = await fetch(`${API_BASE}/reports/saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Rapor kaydedilemedi.');
    return data;
  },

  async updateSavedReport(id: number, payload: Partial<SavedReport>): Promise<SavedReport> {
    const res = await fetch(`${API_BASE}/reports/saved/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Rapor güncellenemedi.');
    return data;
  },

  async deleteSavedReport(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/reports/saved/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Rapor silinemedi.');
    return data;
  },
};
