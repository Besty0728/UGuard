import { getKV, hydrateAppData, jsonResponse, normalizeAccessWindow, normalizeExpiresAt } from '../../_shared.js';

export async function onRequestGet(context) {
  try {
    const kv = getKV(context);
    const listRaw = await kv.get('apps_list', { type: 'json' });
    const appIds = listRaw || [];

    const apps = [];
    for (const id of appIds) {
      const appData = await kv.get(`app_${id}`, { type: 'json' });
      if (!appData) {
        continue;
      }

      const devices = await kv.get(`devices_${id}`, { type: 'json' });
      apps.push({
        ...hydrateAppData(appData),
        deviceCount: Array.isArray(devices) ? devices.length : 0,
      });
    }

    return jsonResponse({ success: true, data: apps });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const kv = getKV(context);
    const { name, maxDevices = 5, expiresAt = null, accessWindow } = await request.json();

    if (!name || typeof name !== 'string') {
      return jsonResponse({ success: false, error: 'app name is required' }, 400);
    }

    const idBytes = new Uint8Array(8);
    crypto.getRandomValues(idBytes);
    const appId = Array.from(idBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const tokenHex = Array.from(tokenBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const token = `sk_${tokenHex}`;

    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const now = new Date().toISOString();
    const appData = {
      id: appId,
      name,
      tokenHash,
      status: 'active',
      createdAt: now,
      expiresAt: normalizeExpiresAt(expiresAt),
      maxDevices: maxDevices || 0,
      logRetention: -1,
      accessWindow: normalizeAccessWindow(accessWindow),
      permissions: { features: ['full'] },
    };

    await kv.put(`app_${appId}`, JSON.stringify(appData));
    await kv.put(`token_${tokenHash}`, JSON.stringify({ appId, status: 'active' }));
    await kv.put(`token_plain_${appId}`, token);

    const listRaw = await kv.get('apps_list', { type: 'json' });
    const appIds = listRaw || [];
    appIds.push(appId);
    await kv.put('apps_list', JSON.stringify(appIds));
    await kv.put(`devices_${appId}`, JSON.stringify([]));

    return jsonResponse({
      success: true,
      data: { app: hydrateAppData(appData), token },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
