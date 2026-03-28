import type {
  ApiResponse,
  AppInfo,
  CreateAppResponse,
  DeviceInfo,
  AccessLog,
  LogFilter,
} from '@/types';

const BASE = '/api';

function getHeaders(): HeadersInit {
  const adminKey = sessionStorage.getItem('adminKey');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (adminKey) {
    headers['X-Admin-Key'] = adminKey;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? '请求失败');
  }
  return json.data as T;
}

// ─── Auth ───

export async function login(adminKey: string): Promise<boolean> {
  const res = await fetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey }),
  });
  const json: ApiResponse = await res.json();
  return json.success;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return request<void>('/user/password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

// ─── Apps ───

export async function getApps(): Promise<AppInfo[]> {
  return request<AppInfo[]>('/apps');
}

export async function createApp(name: string, maxDevices: number, expiresAt: string | null): Promise<CreateAppResponse> {
  return request<CreateAppResponse>('/apps', {
    method: 'POST',
    body: JSON.stringify({ name, maxDevices, expiresAt }),
  });
}

export async function getApp(appId: string): Promise<AppInfo> {
  return request<AppInfo>(`/apps/${appId}`);
}

export async function updateApp(appId: string, updates: Partial<Pick<AppInfo, 'name' | 'status' | 'maxDevices' | 'logRetention' | 'expiresAt'>>): Promise<AppInfo> {
  return request<AppInfo>(`/apps/${appId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteApp(appId: string): Promise<void> {
  return request<void>(`/apps/${appId}`, { method: 'DELETE' });
}

// ─── Devices ───

export async function getDevices(appId: string): Promise<DeviceInfo[]> {
  return request<DeviceInfo[]>(`/apps/${appId}/devices`);
}

export async function updateDevice(appId: string, deviceId: string, updates: { banned: boolean; note?: string }): Promise<DeviceInfo> {
  return request<DeviceInfo>(`/apps/${appId}/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ─── Logs ───

export async function getLogs(filter?: LogFilter): Promise<{ logs: AccessLog[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (filter?.appId) params.set('appId', filter.appId);
  if (filter?.result) params.set('result', filter.result);
  if (filter?.limit) params.set('limit', String(filter.limit));
  if (filter?.cursor) params.set('cursor', filter.cursor);
  const qs = params.toString();
  return request<{ logs: AccessLog[]; cursor?: string }>(`/logs${qs ? `?${qs}` : ''}`);
}

export async function deleteLog(logId: string): Promise<void> {
  return request<void>(`/logs/${logId}`, { method: 'DELETE' });
}
