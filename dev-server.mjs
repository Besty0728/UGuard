/**
 * 本地开发服务器 — 模拟 EdgeOne Edge Functions + KV
 * 使用内存 Map 模拟 KV 存储，用于本地调试
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 从 .env 读取环境变量
function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = value;
    }
  } catch {
    console.error('⚠️  未找到 .env 文件，请先创建');
  }
}

loadEnv();

// ─── 内存 KV 模拟 ───

function createKVNamespace() {
  const store = new Map();
  return {
    async get(key, options) {
      const val = store.get(key) ?? null;
      if (val === null) return null;
      if (options?.type === 'json') return JSON.parse(val);
      return val;
    },
    async put(key, value) {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key) {
      store.delete(key);
    },
    async list(options = {}) {
      const { prefix = '', limit = 256, cursor } = options;
      let keys = [...store.keys()].filter(k => k.startsWith(prefix)).sort();
      // 简易游标分页
      if (cursor) {
        const idx = keys.indexOf(cursor);
        if (idx !== -1) keys = keys.slice(idx + 1);
      }
      const complete = keys.length <= limit;
      const sliced = keys.slice(0, limit);
      return {
        keys: sliced.map(name => ({ name })),
        complete,
        cursor: complete ? undefined : sliced[sliced.length - 1],
      };
    },
    // 调试用
    _dump() { return Object.fromEntries(store); },
  };
}

const app_store = createKVNamespace();
const access_logs = createKVNamespace();

// ─── 路由处理 ───

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function json(data, status = 200) {
  return { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify(data) };
}

// 动态导入各路由的处理逻辑（内联实现，避免 ESM 和 Edge API 差异）

async function handleAuth(method, body) {
  if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  const { adminKey } = body;
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
    return json({ success: false, error: '密钥无效' }, 401);
  }
  return json({ success: true });
}

async function handleApps(method, body) {
  if (method === 'GET') {
    const listRaw = await app_store.get('apps_list', { type: 'json' });
    const appIds = listRaw || [];
    const apps = [];
    for (const id of appIds) {
      const appData = await app_store.get(`app_${id}`, { type: 'json' });
      if (appData) apps.push(appData);
    }
    return json({ success: true, data: apps });
  }

  if (method === 'POST') {
    const { name, maxDevices = 5, expiresAt = null } = body;
    if (!name) return json({ success: false, error: '应用名称不能为空' }, 400);

    const appId = randomBytes(8).toString('hex');
    const tokenHex = randomBytes(32).toString('hex');
    const token = `sk_${tokenHex}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();

    const appData = {
      id: appId, name, tokenHash, status: 'active',
      createdAt: now, expiresAt: expiresAt || null,
      maxDevices: maxDevices || 0,
      permissions: { features: ['full'] },
    };

    await app_store.put(`app_${appId}`, JSON.stringify(appData));
    await app_store.put(`token_${tokenHash}`, JSON.stringify({ appId, status: 'active' }));
    const appIds = (await app_store.get('apps_list', { type: 'json' })) || [];
    appIds.push(appId);
    await app_store.put('apps_list', JSON.stringify(appIds));
    await app_store.put(`devices_${appId}`, JSON.stringify([]));

    return json({ success: true, data: { app: appData, token } });
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

async function handleAppDetail(method, appId, body) {
  const appData = await app_store.get(`app_${appId}`, { type: 'json' });
  if (!appData) return json({ success: false, error: '应用不存在' }, 404);

  if (method === 'GET') return json({ success: true, data: appData });

  if (method === 'PUT') {
    if (body.name !== undefined) appData.name = body.name;
    if (body.status !== undefined) appData.status = body.status;
    if (body.maxDevices !== undefined) appData.maxDevices = body.maxDevices;
    if (body.expiresAt !== undefined) appData.expiresAt = body.expiresAt;
    await app_store.put(`app_${appId}`, JSON.stringify(appData));

    if (body.status) {
      const ti = await app_store.get(`token_${appData.tokenHash}`, { type: 'json' });
      if (ti) {
        ti.status = body.status === 'active' ? 'active' : 'revoked';
        await app_store.put(`token_${appData.tokenHash}`, JSON.stringify(ti));
      }
    }
    return json({ success: true, data: appData });
  }

  if (method === 'DELETE') {
    await app_store.delete(`token_${appData.tokenHash}`);
    const deviceList = (await app_store.get(`devices_${appId}`, { type: 'json' })) || [];
    for (const fp of deviceList) await app_store.delete(`device_${appId}_${fp}`);
    await app_store.delete(`devices_${appId}`);
    await app_store.delete(`app_${appId}`);
    const list = (await app_store.get('apps_list', { type: 'json' })) || [];
    await app_store.put('apps_list', JSON.stringify(list.filter(id => id !== appId)));
    return json({ success: true });
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

async function handleDevices(method, appId) {
  if (method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405);
  const deviceList = (await app_store.get(`devices_${appId}`, { type: 'json' })) || [];
  const devices = [];
  for (const fp of deviceList) {
    const d = await app_store.get(`device_${appId}_${fp}`, { type: 'json' });
    if (d) devices.push(d);
  }
  return json({ success: true, data: devices });
}

async function handleDeviceUpdate(method, appId, deviceId, body) {
  if (method !== 'PUT') return json({ success: false, error: 'Method not allowed' }, 405);
  const deviceList = (await app_store.get(`devices_${appId}`, { type: 'json' })) || [];
  for (const fp of deviceList) {
    const d = await app_store.get(`device_${appId}_${fp}`, { type: 'json' });
    if (d && d.deviceId === deviceId) {
      if (body.banned !== undefined) { d.banned = body.banned; d.bannedAt = body.banned ? new Date().toISOString() : null; }
      if (body.note !== undefined) d.note = body.note;
      await app_store.put(`device_${appId}_${fp}`, JSON.stringify(d));
      return json({ success: true, data: d });
    }
  }
  return json({ success: false, error: '设备不存在' }, 404);
}

async function handleVerify(method, body, ip) {
  if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  const { token, fingerprint, os, unityVersion, deviceModel } = body;
  if (!token || !fingerprint) return json({ valid: false, reason: '缺少必要参数' }, 400);

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const tokenIndex = await app_store.get(`token_${tokenHash}`, { type: 'json' });
  if (!tokenIndex) return json({ valid: false, reason: 'invalid_token' });
  if (tokenIndex.status !== 'active') return json({ valid: false, reason: 'token_revoked' });

  const appData = await app_store.get(`app_${tokenIndex.appId}`, { type: 'json' });
  if (!appData) return json({ valid: false, reason: 'app_not_found' });
  if (appData.status !== 'active') return json({ valid: false, reason: 'app_suspended' });
  if (appData.expiresAt && new Date(appData.expiresAt) < new Date()) return json({ valid: false, reason: 'app_expired' });

  const fpHash = createHash('sha256').update(fingerprint).digest('hex');
  const deviceKey = `device_${appData.id}_${fpHash}`;
  let device = await app_store.get(deviceKey, { type: 'json' });

  if (device) {
    if (device.banned) return json({ valid: false, reason: 'device_banned' });
    device.lastSeen = new Date().toISOString();
    device.lastIP = ip;
    device.accessCount += 1;
    await app_store.put(deviceKey, JSON.stringify(device));
  } else {
    if (appData.maxDevices > 0) {
      const dl = (await app_store.get(`devices_${appData.id}`, { type: 'json' })) || [];
      if (dl.length >= appData.maxDevices) return json({ valid: false, reason: 'max_devices_reached' });
    }
    const now = new Date().toISOString();
    device = {
      deviceId: 'dev_' + randomBytes(6).toString('hex'),
      fingerprint: fpHash, firstSeen: now, lastSeen: now, lastIP: ip,
      accessCount: 1, banned: false, bannedAt: null,
      os: os || '', unityVersion: unityVersion || '', deviceModel: deviceModel || '', note: '',
    };
    await app_store.put(deviceKey, JSON.stringify(device));
    const dl = (await app_store.get(`devices_${appData.id}`, { type: 'json' })) || [];
    dl.push(fpHash);
    await app_store.put(`devices_${appData.id}`, JSON.stringify(dl));
  }

  return json({ valid: true, permissions: appData.permissions });
}

async function handleLogs(method, url) {
  if (method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405);
  const filterAppId = url.searchParams.get('appId') || '';
  const filterResult = url.searchParams.get('result') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 256);
  const cursor = url.searchParams.get('cursor') || undefined;

  const listResult = await access_logs.list({ prefix: 'log_', limit: 256, cursor });
  const logs = [];
  for (const key of listResult.keys) {
    const logData = await access_logs.get(key.name, { type: 'json' });
    if (!logData) continue;
    if (filterAppId && logData.appId !== filterAppId) continue;
    if (filterResult && logData.result !== filterResult) continue;
    logs.push(logData);
    if (logs.length >= limit) break;
  }
  logs.reverse();

  return json({ success: true, data: { logs, cursor: listResult.complete ? undefined : listResult.cursor } });
}

// ─── 路由匹配 ───

async function route(req) {
  const url = new URL(req.url, `http://localhost`);
  const method = req.method;
  const path = url.pathname;

  if (method === 'OPTIONS') return { status: 204, headers: CORS_HEADERS, body: '' };

  // 读取请求体
  let body = {};
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch { body = {}; }
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // /api/verify 不需要鉴权
  if (path === '/api/verify') return handleVerify(method, body, ip);

  // /api/auth 特殊处理
  if (path === '/api/auth') return handleAuth(method, body);

  // 其他 /api/* 需要 Admin Key
  if (path.startsWith('/api/')) {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
      return json({ success: false, error: '未授权' }, 401);
    }
  }

  // 路由匹配
  // /api/apps
  if (path === '/api/apps') return handleApps(method, body);

  // /api/apps/:appId/devices/:deviceId
  const deviceDetailMatch = path.match(/^\/api\/apps\/([^/]+)\/devices\/([^/]+)$/);
  if (deviceDetailMatch) return handleDeviceUpdate(method, deviceDetailMatch[1], deviceDetailMatch[2], body);

  // /api/apps/:appId/devices
  const devicesMatch = path.match(/^\/api\/apps\/([^/]+)\/devices$/);
  if (devicesMatch) return handleDevices(method, devicesMatch[1]);

  // /api/apps/:appId
  const appMatch = path.match(/^\/api\/apps\/([^/]+)$/);
  if (appMatch) return handleAppDetail(method, appMatch[1], body);

  // /api/logs
  if (path === '/api/logs') return handleLogs(method, url);

  return json({ success: false, error: 'Not found' }, 404);
}

// ─── 启动服务器 ───

const PORT = 8088;

const server = createServer(async (req, res) => {
  try {
    const result = await route(req);
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  } catch (e) {
    console.error('❌', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🛡️  UGuard 本地开发服务器已启动: http://localhost:${PORT}`);
  console.log(`   KV 存储: 内存模式（重启后数据清空）`);
  console.log(`   ADMIN_SECRET: ${process.env.ADMIN_SECRET ? '✅ 已加载' : '❌ 未设置'}\n`);
});
