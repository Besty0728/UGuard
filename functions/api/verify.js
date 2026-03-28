import { getKV, jsonResponse } from '../_shared.js';

export async function onRequestPost(context) {
  const { request } = context;
  const kv = getKV(context);
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { token, fingerprint, os, unityVersion, deviceModel, timezone } = body;

    if (!token || !fingerprint) {
      await writeLog(kv, 'unknown', '', fingerprint || '', ip, 'denied', 'missing token or fingerprint', request);
      return jsonResponse({ valid: false, reason: 'missing_required_fields' }, 400);
    }

    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const tokenIndex = await kv.get(`token_${tokenHash}`, { type: 'json' });
    if (!tokenIndex) {
      await writeLog(kv, 'unknown', '', fingerprint, ip, 'denied', 'token not found', request);
      return jsonResponse({ valid: false, reason: 'invalid_token' });
    }

    if (tokenIndex.status !== 'active') {
      await writeLog(kv, tokenIndex.appId, '', fingerprint, ip, 'denied', 'token revoked', request);
      return jsonResponse({ valid: false, reason: 'token_revoked' });
    }

    const appData = await kv.get(`app_${tokenIndex.appId}`, { type: 'json' });
    if (!appData) {
      await writeLog(kv, tokenIndex.appId, '', fingerprint, ip, 'denied', 'app not found', request);
      return jsonResponse({ valid: false, reason: 'app_not_found' });
    }

    if (appData.status !== 'active') {
      await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'suspended', 'app suspended', request);
      return jsonResponse({ valid: false, reason: 'app_suspended' });
    }

    if (appData.expiresAt && new Date(appData.expiresAt) < new Date()) {
      await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'expired', 'app expired', request);
      return jsonResponse({ valid: false, reason: 'app_expired' });
    }

    const fpHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
    const fpHash = Array.from(new Uint8Array(fpHashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const deviceKey = `device_${appData.id}_${fpHash}`;
    let device = await kv.get(deviceKey, { type: 'json' });

    if (device) {
      if (device.banned) {
        await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'banned', 'device banned', request);
        return jsonResponse({ valid: false, reason: 'device_banned' });
      }

      device.lastSeen = new Date().toISOString();
      device.lastIP = ip;
      device.accessCount += 1;
      await kv.put(deviceKey, JSON.stringify(device));
    } else {
      if (appData.maxDevices > 0) {
        const deviceList = (await kv.get(`devices_${appData.id}`, { type: 'json' })) || [];
        if (deviceList.length >= appData.maxDevices) {
          await writeLog(
            kv,
            appData.id,
            appData.name,
            fingerprint,
            ip,
            'max_devices',
            `device limit reached: ${appData.maxDevices}`,
            request,
          );
          return jsonResponse({ valid: false, reason: 'max_devices_reached' });
        }
      }

      const devIdBytes = new Uint8Array(6);
      crypto.getRandomValues(devIdBytes);
      const devId =
        'dev_' +
        Array.from(devIdBytes)
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');

      const now = new Date().toISOString();
      device = {
        deviceId: devId,
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

      await kv.put(deviceKey, JSON.stringify(device));

      const deviceList = (await kv.get(`devices_${appData.id}`, { type: 'json' })) || [];
      deviceList.push(fpHash);
      await kv.put(`devices_${appData.id}`, JSON.stringify(deviceList));
    }

    if (appData.logRetention !== 0) {
      await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'allowed', '', request);
    }

    return jsonResponse({
      valid: true,
      permissions: appData.permissions,
    });
  } catch (error) {
    console.error('[verify] request failed', error);
    return jsonResponse({ valid: false, reason: 'internal_error' }, 500);
  }
}

function getClientIp(request) {
  if (request?.eo?.clientIp) {
    return String(request.eo.clientIp).trim();
  }

  const directIp =
    request.headers.get('EO-Client-IP') ||
    request.headers.get('EO-Connecting-IP') ||
    request.headers.get('X-Real-IP') ||
    request.headers.get('X-Client-IP');

  if (directIp) {
    return directIp.trim();
  }

  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(',')
      .map((item) => item.trim())
      .find(Boolean);

    if (firstIp) {
      return firstIp;
    }
  }

  return 'unknown';
}

async function writeLog(kv, appId, appName, fingerprint, ip, result, reason, request) {
  try {
    const now = Date.now();
    const randBytes = new Uint8Array(4);
    crypto.getRandomValues(randBytes);
    const rand = Array.from(randBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const logId = `${now}_${rand}`;
    const logKey = `log_${logId}`;

    const logData = {
      id: logId,
      appId,
      appName,
      deviceFingerprint: fingerprint,
      ip,
      action: 'verify',
      result,
      reason,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('User-Agent') || '',
    };

    await kv.put(logKey, JSON.stringify(logData));
  } catch (error) {
    console.error('[verify] failed to write log', error);
  }
}
