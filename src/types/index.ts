/** 应用状态 */
export type AppStatus = 'active' | 'suspended';

/** 应用数据（对应 KV key: app_{appId}） */
export interface AppInfo {
  id: string;
  name: string;
  tokenHash: string;
  status: AppStatus;
  createdAt: string;
  expiresAt: string | null;
  maxDevices: number;
  logRetention: number; // -1=全部记录, 0=不记录, N>0=保留最近N条
  permissions: { features: string[] };
  token?: string; // 仅详情接口返回
}

/** Token 反查索引（对应 KV key: token_{sha256hex}） */
export interface TokenIndex {
  appId: string;
  status: 'active' | 'revoked';
}

/** 设备记录（对应 KV key: device_{appId}_{fingerprint}） */
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

/** 访问日志（对应 KV key: log_{timestamp}_{random}） */
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

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 创建应用时的响应（包含明文 Token，仅此一次） */
export interface CreateAppResponse {
  app: AppInfo;
  token: string;
}

/** Unity 客户端验证请求 */
export interface VerifyRequest {
  token: string;
  fingerprint: string;
  os?: string;
  unityVersion?: string;
  deviceModel?: string;
  timezone?: string;
}

/** Unity 客户端验证响应 */
export interface VerifyResponse {
  valid: boolean;
  reason?: string;
  permissions?: { features: string[] };
}

/** 日志查询参数 */
export interface LogFilter {
  appId?: string;
  result?: string;
  limit?: number;
  cursor?: string;
}

/** KV list 返回 */
export interface KVListResult {
  keys: { name: string }[];
  complete: boolean;
  cursor?: string;
}
