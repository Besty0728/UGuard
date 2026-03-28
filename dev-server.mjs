import { createServer } from 'http';
import { readFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  getAccessWindowStatus,
  getGeoRestrictionStatus,
  hydrateAppData,
  normalizeAccessWindow,
  normalizeExpiresAt,
  normalizeGeoRestriction,
} from './functions/_shared.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      process.env[key] = value;
    }
  } catch {
    console.error('Missing .env file');
  }
}

loadEnv();

function createKVNamespace() {
  const store = new Map();

  return {
    async get(key, options) {
      const value = store.get(key) ?? null;
      if (value === null) return null;
      return options?.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key) {
      store.delete(key);
    },
    async list(options = {}) {
      const prefix = options.prefix ?? '';
      const limit = options.limit ?? 256;
      const cursor = options.cursor;
      let keys = [...store.keys()].filter((key) => key.startsWith(prefix)).sort();

      if (cursor) {
        const index = keys.indexOf(cursor);
        if (index >= 0) {
          keys = keys.slice(index + 1);
        }
      }

      const sliced = keys.slice(0, limit);
      return {
        keys: sliced.map((key) => ({ key })),
        complete: keys.length <= limit,
        cursor: keys.length <= limit ? undefined : sliced[sliced.length - 1],
      };
    },
    dump() {
      return Object.fromEntries(store);
    },
  };
}

const ug_guard = createKVNamespace();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function json(data, status = 200) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify(data),
  };
}

function denyResponse(reason, message, detail = {}, status = 200) {
  return json({ valid: false, reason, message, detail }, status);
}

async function handleAuth(method, body) {
  if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  const envPwd = process.env.ADMIN_SECRET;
  const kvPwd = await ug_guard.get('admin_pwd');

  if (!body.adminKey || (body.adminKey !== envPwd && body.adminKey !== kvPwd)) {
    return json({ success: false, error: 'Invalid admin key' }, 401);
  }

  return json({ success: true });
}

async function handlePassword(method, body) {
  if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  const envPwd = process.env.ADMIN_SECRET;
  const kvPwd = await ug_guard.get('admin_pwd');

  if (!body.oldPassword || (body.oldPassword !== envPwd && body.oldPassword !== kvPwd)) {
    return json({ success: false, error: 'Old password is invalid' }, 400);
  }

  if (!body.newPassword || body.newPassword.length < 6) {
    return json({ success: false, error: 'New password must be at least 6 characters' }, 400);
  }

  await ug_guard.put('admin_pwd', body.newPassword);
  return json({ success: true });
}

async function handleApps(method, body) {
  if (method === 'GET') {
    const appIds = (await ug_guard.get('apps_list', { type: 'json' })) || [];
    const apps = [];

    for (const id of appIds) {
      const appData = await ug_guard.get(`app_${id}`, { type: 'json' });
      if (!appData) continue;
      const devices = await ug_guard.get(`devices_${id}`, { type: 'json' });
      apps.push({
        ...hydrateAppData(appData),
        deviceCount: Array.isArray(devices) ? devices.length : 0,
      });
    }

    return json({ success: true, data: apps });
  }

  if (method === 'POST') {
    const { name, maxDevices = 5, expiresAt = null, accessWindow, geoRestriction } = body;
    if (!name) {
      return json({ success: false, error: 'App name is required' }, 400);
    }

    const appId = randomBytes(8).toString('hex');
    const token = `sk_${randomBytes(32).toString('hex')}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const appData = {
      id: appId,
      name,
      tokenHash,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: normalizeExpiresAt(expiresAt),
      maxDevices: maxDevices || 0,
      logRetention: -1,
      accessWindow: normalizeAccessWindow(accessWindow),
      geoRestriction: normalizeGeoRestriction(geoRestriction),
      permissions: { features: ['full'] },
    };

    await ug_guard.put(`app_${appId}`, JSON.stringify(appData));
    await ug_guard.put(`token_${tokenHash}`, JSON.stringify({ appId, status: 'active' }));
    await ug_guard.put(`token_plain_${appId}`, token);

    const appIds = (await ug_guard.get('apps_list', { type: 'json' })) || [];
    appIds.push(appId);
    await ug_guard.put('apps_list', JSON.stringify(appIds));
    await ug_guard.put(`devices_${appId}`, JSON.stringify([]));

    return json({ success: true, data: { app: hydrateAppData(appData), token } });
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

async function handleAppDetail(method, appId, body) {
  const appData = await ug_guard.get(`app_${appId}`, { type: 'json' });
  if (!appData) {
    return json({ success: false, error: 'App not found' }, 404);
  }

  if (method === 'GET') {
    const token = await ug_guard.get(`token_plain_${appId}`);
    return json({ success: true, data: { ...hydrateAppData(appData), token } });
  }

  if (method === 'PUT') {
    if (body.name !== undefined) appData.name = body.name;
    if (body.status !== undefined) appData.status = body.status;
    if (body.maxDevices !== undefined) appData.maxDevices = body.maxDevices;
    if (body.logRetention !== undefined) appData.logRetention = body.logRetention;
    if (body.expiresAt !== undefined) appData.expiresAt = normalizeExpiresAt(body.expiresAt);
    if (body.accessWindow !== undefined) appData.accessWindow = normalizeAccessWindow(body.accessWindow);
    if (body.geoRestriction !== undefined) appData.geoRestriction = normalizeGeoRestriction(body.geoRestriction);

    await ug_guard.put(`app_${appId}`, JSON.stringify(appData));

    if (body.status !== undefined) {
      const tokenIndex = await ug_guard.get(`token_${appData.tokenHash}`, { type: 'json' });
      if (tokenIndex) {
        tokenIndex.status = body.status === 'active' ? 'active' : 'revoked';
        await ug_guard.put(`token_${appData.tokenHash}`, JSON.stringify(tokenIndex));
      }
    }

    const token = await ug_guard.get(`token_plain_${appId}`);
    return json({ success: true, data: { ...hydrateAppData(appData), token } });
  }

  if (method === 'DELETE') {
    await ug_guard.delete(`token_${appData.tokenHash}`);
    await ug_guard.delete(`token_plain_${appId}`);

    const deviceList = (await ug_guard.get(`devices_${appId}`, { type: 'json' })) || [];
    for (const fingerprint of deviceList) {
      await ug_guard.delete(`device_${appId}_${fingerprint}`);
    }
    await ug_guard.delete(`devices_${appId}`);
    await ug_guard.delete(`app_${appId}`);
    await deleteLogsForApp(appId);

    const appsList = (await ug_guard.get('apps_list', { type: 'json' })) || [];
    await ug_guard.put('apps_list', JSON.stringify(appsList.filter((id) => id !== appId)));
    return json({ success: true });
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

async function handleDevices(method, appId) {
  if (method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405);

  const deviceFingerprints = (await ug_guard.get(`devices_${appId}`, { type: 'json' })) || [];
  const devices = [];

  for (const fingerprint of deviceFingerprints) {
    const device = await ug_guard.get(`device_${appId}_${fingerprint}`, { type: 'json' });
    if (device) devices.push(device);
  }

  return json({ success: true, data: devices });
}

async function handleDeviceUpdate(method, appId, deviceId, body) {
  if (method !== 'PUT') return json({ success: false, error: 'Method not allowed' }, 405);

  const deviceFingerprints = (await ug_guard.get(`devices_${appId}`, { type: 'json' })) || [];

  for (const fingerprint of deviceFingerprints) {
    const device = await ug_guard.get(`device_${appId}_${fingerprint}`, { type: 'json' });
    if (device?.deviceId !== deviceId) continue;

    if (body.banned !== undefined) {
      device.banned = body.banned;
      device.bannedAt = body.banned ? new Date().toISOString() : null;
    }
    if (body.note !== undefined) {
      device.note = body.note;
    }

    await ug_guard.put(`device_${appId}_${fingerprint}`, JSON.stringify(device));
    return json({ success: true, data: device });
  }

  return json({ success: false, error: 'Device not found' }, 404);
}

async function deleteLogsForApp(appId) {
  let cursor;

  do {
    const listOptions = { prefix: 'log_', limit: 256 };
    if (cursor) listOptions.cursor = cursor;
    const listResult = await ug_guard.list(listOptions);

    for (const entry of listResult.keys || []) {
      const kvKey = entry?.key ?? entry?.name;
      if (!kvKey) continue;
      const logData = await ug_guard.get(kvKey, { type: 'json' });
      if (logData?.appId === appId) {
        await ug_guard.delete(kvKey);
      }
    }

    cursor = listResult.complete ? undefined : listResult.cursor;
  } while (cursor);
}

async function handleVerify(method, body, ip) {
  if (method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const { token, fingerprint, os, unityVersion, deviceModel, timezone } = body;
  if (!token || !fingerprint) {
    await writeLog('unknown', '', fingerprint || '', ip, 'denied', 'missing token or fingerprint');
    return denyResponse(
      'missing_required_fields',
      '缺少必要参数',
      { missingFields: ['token', 'fingerprint'].filter((field) => !body[field]) },
      400,
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const tokenIndex = await ug_guard.get(`token_${tokenHash}`, { type: 'json' });
  if (!tokenIndex) {
    await writeLog('unknown', '', fingerprint, ip, 'denied', 'token not found');
    return denyResponse('invalid_token', 'Token 无效');
  }

  if (tokenIndex.status !== 'active') {
    await writeLog(tokenIndex.appId, '', fingerprint, ip, 'denied', 'token revoked');
    return denyResponse('token_revoked', 'Token 已吊销', { status: tokenIndex.status });
  }

  const rawAppData = await ug_guard.get(`app_${tokenIndex.appId}`, { type: 'json' });
  if (!rawAppData) {
    await writeLog(tokenIndex.appId, '', fingerprint, ip, 'denied', 'app not found');
    return denyResponse('app_not_found', '应用不存在');
  }

  const appData = hydrateAppData(rawAppData);

  if (appData.status !== 'active') {
    await writeLog(appData.id, appData.name, fingerprint, ip, 'suspended', 'app suspended');
    return denyResponse('app_suspended', '应用已暂停', { status: appData.status });
  }

  if (appData.expiresAt && new Date(appData.expiresAt) < new Date()) {
    await writeLog(appData.id, appData.name, fingerprint, ip, 'expired', 'app expired');
    return denyResponse('app_expired', '应用已过期', { expiresAt: appData.expiresAt });
  }

  const geoRestrictionStatus = getGeoRestrictionStatus(appData.geoRestriction, {
    eo: {
      geo: {
        countryCodeAlpha2: body.countryCode,
        countryName: body.countryName,
        regionCode: body.regionCode,
        regionName: body.regionName,
      },
    },
    headers: new Map(),
  });

  if (!geoRestrictionStatus.allowed) {
    await writeLog(appData.id, appData.name, fingerprint, ip, 'denied', buildGeoRestrictionReason(geoRestrictionStatus));
    return denyResponse('geo_restricted', '当前国家或地区不允许访问', {
      countryCode: geoRestrictionStatus.location.countryCode,
      countryName: geoRestrictionStatus.location.countryName,
      regionCode: geoRestrictionStatus.location.regionCode,
      regionName: geoRestrictionStatus.location.regionName,
      allowedCountries: geoRestrictionStatus.geoRestriction.allowedCountries,
      allowedRegions: geoRestrictionStatus.geoRestriction.allowedRegions,
    });
  }

  const accessWindowStatus = getAccessWindowStatus(appData.accessWindow);
  if (!accessWindowStatus.open) {
    await writeLog(appData.id, appData.name, fingerprint, ip, 'denied', buildAccessWindowReason(accessWindowStatus));
    return denyResponse('outside_access_hours', '当前不在开放时段内', {
      timezone: accessWindowStatus.accessWindow.timezone,
      startHour: accessWindowStatus.accessWindow.startHour,
      endHour: accessWindowStatus.accessWindow.endHour,
      currentHour: accessWindowStatus.currentHour,
    });
  }

  const fpHash = createHash('sha256').update(fingerprint).digest('hex');
  const deviceKey = `device_${appData.id}_${fpHash}`;
  let device = await ug_guard.get(deviceKey, { type: 'json' });

  if (device) {
    if (device.banned) {
      await writeLog(appData.id, appData.name, fingerprint, ip, 'banned', 'device banned');
      return denyResponse('device_banned', '设备已封禁');
    }

    device.lastSeen = new Date().toISOString();
    device.lastIP = ip;
    device.accessCount += 1;
    await ug_guard.put(deviceKey, JSON.stringify(device));
  } else {
    if (appData.maxDevices > 0) {
      const deviceList = (await ug_guard.get(`devices_${appData.id}`, { type: 'json' })) || [];
      if (deviceList.length >= appData.maxDevices) {
        await writeLog(appData.id, appData.name, fingerprint, ip, 'max_devices', `device limit reached: ${appData.maxDevices}`);
        return denyResponse('max_devices_reached', '设备数已达上限', { limit: appData.maxDevices });
      }
    }

    const now = new Date().toISOString();
    device = {
      deviceId: `dev_${randomBytes(6).toString('hex')}`,
      fingerprint: fpHash,
      firstSeen: now,
      lastSeen: now,
      lastIP: ip,
      accessCount: 1,
      banned: false,
      bannedAt: null,
      os: os || '',
      unityVersion: unityVersion || '',
      deviceModel: deviceModel || '',
      timezone: timezone || '',
      note: '',
    };

    await ug_guard.put(deviceKey, JSON.stringify(device));
    const deviceList = (await ug_guard.get(`devices_${appData.id}`, { type: 'json' })) || [];
    deviceList.push(fpHash);
    await ug_guard.put(`devices_${appData.id}`, JSON.stringify(deviceList));
  }

  if (appData.logRetention !== 0) {
    await writeLog(appData.id, appData.name, fingerprint, ip, 'allowed', '');
  }

  return json({ valid: true, permissions: appData.permissions });
}

async function writeLog(appId, appName, fingerprint, ip, result, reason) {
  try {
    const logId = `${Date.now()}_${randomBytes(4).toString('hex')}`;
    await ug_guard.put(`log_${logId}`, JSON.stringify({
      id: logId,
      appId,
      appName,
      deviceFingerprint: fingerprint,
      ip,
      action: 'verify',
      result,
      reason,
      timestamp: new Date().toISOString(),
      userAgent: '',
    }));
  } catch {}
}

function buildAccessWindowReason(accessWindowStatus) {
  const { accessWindow, currentHour } = accessWindowStatus;
  return `outside access hours ${padHour(accessWindow.startHour)}:00-${padHour(accessWindow.endHour)}:00 (${accessWindow.timezone}), current ${padHour(currentHour)}:00`;
}

function buildGeoRestrictionReason(geoRestrictionStatus) {
  const { location, geoRestriction } = geoRestrictionStatus;
  return `geo restricted country=${location.countryCode || 'unknown'} region=${location.regionCode || location.regionName || 'unknown'} allowCountries=${geoRestriction.allowedCountries.join('|') || '*'} allowRegions=${geoRestriction.allowedRegions.join('|') || '*'}`;
}

function padHour(hour) {
  return String(hour).padStart(2, '0');
}

async function handleLogs(method, url) {
  if (method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405);

  const filterAppId = url.searchParams.get('appId') || '';
  const filterResult = url.searchParams.get('result') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 256);
  const cursor = url.searchParams.get('cursor') || undefined;

  const listOptions = { prefix: 'log_', limit: 256 };
  if (cursor) listOptions.cursor = cursor;
  const listResult = await ug_guard.list(listOptions);

  const allMatched = [];
  for (const entry of listResult.keys || []) {
    const kvKey = entry?.key ?? entry?.name;
    if (!kvKey) continue;
    const logData = await ug_guard.get(kvKey, { type: 'json' });
    if (!logData) continue;
    if (filterAppId && logData.appId !== filterAppId) continue;
    if (filterResult && logData.result !== filterResult) continue;
    allMatched.push({ ...logData, _key: kvKey });
  }

  allMatched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (filterAppId && allMatched.length > 0) {
    try {
      const appData = await ug_guard.get(`app_${filterAppId}`, { type: 'json' });
      const logRetention = appData?.logRetention;
      if (logRetention > 0 && allMatched.length > logRetention) {
        for (const log of allMatched.slice(logRetention)) {
          await ug_guard.delete(log._key);
        }
      }
    } catch {}
  }

  const logs = allMatched.slice(0, limit).map(({ _key, ...log }) => log);
  return json({ success: true, data: { logs, cursor: listResult.complete ? undefined : listResult.cursor } });
}

async function handleLogDelete(method, logId) {
  if (method !== 'DELETE') return json({ success: false, error: 'Method not allowed' }, 405);

  const key = `log_${logId}`;
  const existing = await ug_guard.get(key);
  if (!existing) return json({ success: false, error: 'Log not found' }, 404);

  await ug_guard.delete(key);
  return json({ success: true });
}

async function route(req) {
  const url = new URL(req.url, 'http://localhost');
  const method = req.method;
  const path = url.pathname;

  if (method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  let body = {};
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      body = {};
    }
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (path === '/api/verify') return handleVerify(method, body, ip);
  if (path === '/api/auth') return handleAuth(method, body);

  if (path.startsWith('/api/')) {
    const adminKey = req.headers['x-admin-key'];
    const envPwd = process.env.ADMIN_SECRET;
    const kvPwd = await ug_guard.get('admin_pwd');

    if (!adminKey || (adminKey !== envPwd && adminKey !== kvPwd)) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }
  }

  if (path === '/api/user/password') return handlePassword(method, body);
  if (path === '/api/apps') return handleApps(method, body);

  const deviceMatch = path.match(/^\/api\/apps\/([^/]+)\/devices\/([^/]+)$/);
  if (deviceMatch) return handleDeviceUpdate(method, deviceMatch[1], deviceMatch[2], body);

  const devicesMatch = path.match(/^\/api\/apps\/([^/]+)\/devices$/);
  if (devicesMatch) return handleDevices(method, devicesMatch[1]);

  const appMatch = path.match(/^\/api\/apps\/([^/]+)$/);
  if (appMatch) return handleAppDetail(method, appMatch[1], body);

  const logMatch = path.match(/^\/api\/logs\/([^/]+)$/);
  if (logMatch) return handleLogDelete(method, logMatch[1]);

  if (path === '/api/logs') return handleLogs(method, url);

  return json({ success: false, error: 'Not found' }, 404);
}

const PORT = 8088;

createServer(async (req, res) => {
  try {
    const result = await route(req);
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}).listen(PORT, () => {
  console.log(`UGuard local server running at http://localhost:${PORT}`);
});
