export type AppStatus = 'active' | 'suspended';

export interface AccessWindow {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface AppInfo {
  id: string;
  name: string;
  tokenHash: string;
  status: AppStatus;
  createdAt: string;
  expiresAt: string | null;
  maxDevices: number;
  logRetention: number;
  permissions: { features: string[] };
  accessWindow?: AccessWindow;
  token?: string;
  deviceCount?: number;
}

export interface TokenIndex {
  appId: string;
  status: 'active' | 'revoked';
}

export interface DeviceInfo {
  deviceId: string;
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  lastIP: string;
  accessCount: number;
  banned: boolean;
  bannedAt: string | null;
  os: string;
  unityVersion: string;
  deviceModel: string;
  timezone: string;
  note: string;
}

export interface AccessLog {
  id: string;
  appId: string;
  appName: string;
  deviceFingerprint: string;
  ip: string;
  action: 'verify';
  result: 'allowed' | 'denied' | 'expired' | 'suspended' | 'banned' | 'max_devices';
  reason: string;
  timestamp: string;
  userAgent: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateAppResponse {
  app: AppInfo;
  token: string;
}

export interface VerifyRequest {
  token: string;
  fingerprint: string;
  os?: string;
  unityVersion?: string;
  deviceModel?: string;
  timezone?: string;
}

export interface VerifyResponse {
  valid: boolean;
  reason?: string;
  permissions?: { features: string[] };
}

export interface LogFilter {
  appId?: string;
  result?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: { key?: string; name?: string }[];
  complete: boolean;
  cursor?: string;
}
