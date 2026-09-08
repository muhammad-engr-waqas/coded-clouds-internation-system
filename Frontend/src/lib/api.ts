/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * API client for the CCIMS backend (Node.js/Express/Mongoose).
 * Drop this file into your frontend at: src/lib/api.ts
 *
 * Add to your frontend .env:
 *   VITE_API_URL=http://localhost:5000/api
 *   VITE_SOCKET_URL=http://localhost:5000
 */

import { normalizeDoc } from './normalize';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken(): string | null {
  return localStorage.getItem('ccims_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('ccims_token', token);
  else localStorage.removeItem('ccims_token');
}

/** Prefix a backend-relative upload path (e.g. "/uploads/documents/cv-123.pdf") with the API host. */
export function fileUrl(relativePath?: string) {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  const base = API_URL.replace(/\/api$/, '');
  return `${base}${relativePath}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  isFormData?: boolean;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false } = options;
  const token = getToken();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : 'Request failed';
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }
  // Mongo docs come back keyed by `_id` — mirror to `id` everywhere so components can use either.
  return normalizeDoc(data) as T;
}

// ---------------- Auth ----------------
export const api = {
  auth: {
    login: (username: string, password: string) => request('/auth/login', { method: 'POST', body: { username, password } }),
    me: () => request('/auth/me'),
    forgotPassword: (email: string) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token: string, newPassword: string) =>
      request('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  },

  // ---------------- Employees ----------------
  employees: {
    list: (params: Record<string, string> = {}) => request(`/employees?${new URLSearchParams(params)}`),
    create: (payload: any) => request('/employees', { method: 'POST', body: payload }),
    get: (id: string) => request(`/employees/${id}`),
    update: (id: string, payload: any) => request(`/employees/${id}`, { method: 'PATCH', body: payload }),
    remove: (id: string) => request(`/employees/${id}`, { method: 'DELETE' }),
    setStatus: (id: string, status: string) => request(`/employees/${id}/status`, { method: 'PATCH', body: { status } }),
    uploadDocument: (id: string, file: File, type: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      return request(`/employees/${id}/documents`, { method: 'POST', body: form, isFormData: true });
    },
    deleteDocument: (id: string, docId: string) => request(`/employees/${id}/documents/${docId}`, { method: 'DELETE' }),
  },

  // ---------------- Tasks ----------------
  tasks: {
    listAll: (params: Record<string, string> = {}) => request(`/tasks?${new URLSearchParams(params)}`), // Admin only
    listMine: () => request('/tasks/me'),
    create: (payload: any) => request('/tasks', { method: 'POST', body: payload }), // Admin only
    get: (id: string) => request(`/tasks/${id}`),
    updateStatus: (id: string, status: string) => request(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
    reassign: (id: string, assignedTo: string) => request(`/tasks/${id}/reassign`, { method: 'PATCH', body: { assignedTo } }),
    remove: (id: string) => request(`/tasks/${id}`, { method: 'DELETE' }),
    addReport: (id: string, text: string, attachments: string[] = []) =>
      request(`/tasks/${id}/reports`, { method: 'POST', body: { text, attachments } }),
    getReports: (id: string) => request(`/tasks/${id}/reports`),
  },

  // ---------------- Attendance ----------------
  attendance: {
    checkIn: () => request('/attendance/checkin', { method: 'POST' }),
    checkOut: () => request('/attendance/checkout', { method: 'POST' }),
    mine: (month?: string) => request(`/attendance/me${month ? `?month=${month}` : ''}`),
    all: (params: Record<string, string> = {}) => request(`/attendance?${new URLSearchParams(params)}`),
    forEmployee: (employeeId: string, month?: string) =>
      request(`/attendance/${employeeId}${month ? `?month=${month}` : ''}`),
    adjust: (id: string, payload: any) => request(`/attendance/${id}/adjust`, { method: 'PATCH', body: payload }),
  },

  // ---------------- Leave ----------------
  leave: {
    apply: (payload: any) => request('/leave', { method: 'POST', body: payload }),
    mine: () => request('/leave/me'),
    all: (params: Record<string, string> = {}) => request(`/leave?${new URLSearchParams(params)}`),
    approve: (id: string) => request(`/leave/${id}/approve`, { method: 'PATCH' }),
    reject: (id: string, reason?: string) => request(`/leave/${id}/reject`, { method: 'PATCH', body: { reason } }),
  },

  // ---------------- Payroll ----------------
  payroll: {
    generate: (month?: string) => request(`/payroll/generate${month ? `?month=${month}` : ''}`, { method: 'POST' }),
    list: (params: Record<string, string> = {}) => request(`/payroll?${new URLSearchParams(params)}`),
    update: (id: string, payload: any) => request(`/payroll/${id}`, { method: 'PATCH', body: payload }),
    setStatus: (id: string, status: string) => request(`/payroll/${id}/status`, { method: 'PATCH', body: { status } }),
    payslip: (id: string) => request(`/payroll/${id}/payslip`),
  },

  // ---------------- Projects (Admin only) ----------------
  projects: {
    list: (params: Record<string, string> = {}) => request(`/projects?${new URLSearchParams(params)}`),
    create: (payload: any) => request('/projects', { method: 'POST', body: payload }),
    get: (id: string) => request(`/projects/${id}`),
    update: (id: string, payload: any) => request(`/projects/${id}`, { method: 'PATCH', body: payload }),
    remove: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
    setTeam: (id: string, team: string[]) => request(`/projects/${id}/team`, { method: 'PATCH', body: { team } }),
    updateMilestone: (id: string, milestoneId: string, payload: any) =>
      request(`/projects/${id}/milestones/${milestoneId}`, { method: 'PATCH', body: payload }),
  },

  // ---------------- Chat ----------------
  chat: {
    channels: () => request('/chat/channels'),
    createChannel: (name: string, description: string, members: string[]) =>
      request('/chat/channels', { method: 'POST', body: { name, description, members } }),
    createOrGetDM: (userId: string) => request('/chat/dms', { method: 'POST', body: { userId } }),
    updateChannel: (id: string, payload: any) => request(`/chat/channels/${id}`, { method: 'PATCH', body: payload }),
    deleteChannel: (id: string) => request(`/chat/channels/${id}`, { method: 'DELETE' }),
    addMembers: (id: string, memberIds: string[]) =>
      request(`/chat/channels/${id}/members`, { method: 'POST', body: { memberIds } }),
    removeMember: (id: string, userId: string) => request(`/chat/channels/${id}/members/${userId}`, { method: 'DELETE' }),
    messages: (channelId: string) => request(`/chat/channels/${channelId}/messages`),
    sendMessage: (channelId: string, text: string, attachments: string[] = []) =>
      request(`/chat/channels/${channelId}/messages`, { method: 'POST', body: { text, attachments } }),
    uploadFile: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request('/chat/upload', { method: 'POST', body: form, isFormData: true });
    },
  },

  // ---------------- Settings / Roles ----------------
  settings: {
    get: () => request('/settings'),
    update: (payload: any) => request('/settings', { method: 'PATCH', body: payload }),
    uploadLogo: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request('/settings/logo', { method: 'POST', body: form, isFormData: true });
    },
    roles: () => request('/settings/roles/all'),
    addRole: (name: string) => request('/settings/roles', { method: 'POST', body: { name } }),
    updateRole: (id: string, name: string) => request(`/settings/roles/${id}`, { method: 'PATCH', body: { name } }),
    deleteRole: (id: string) => request(`/settings/roles/${id}`, { method: 'DELETE' }),
  },

  // ---------------- Reports (Admin only) ----------------
  reports: {
    workforce: () => request('/reports/workforce'),
    tasks: () => request('/reports/tasks'),
    attendance: (month?: string) => request(`/reports/attendance${month ? `?month=${month}` : ''}`),
    leave: () => request('/reports/leave'),
    projects: () => request('/reports/projects'),
    payroll: (month?: string) => request(`/reports/payroll${month ? `?month=${month}` : ''}`),
  },

  // ---------------- Audit (Admin only) ----------------
  audit: {
    list: (params: Record<string, string> = {}) => request(`/audit?${new URLSearchParams(params)}`),
  },

  // ---------------- Notifications ----------------
  notifications: {
    list: () => request('/notifications'),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  },
};
