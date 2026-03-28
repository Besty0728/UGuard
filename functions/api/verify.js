import { getAccessWindowStatus, getGeoRestrictionStatus, getKV, getRequestLocation, hydrateAppData, jsonResponse } from '../_shared.js';

export async function onRequestPost(context) {
  const { request } = context;
  const kv = getKV(context);
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { token, fingerprint, os, unityVersion, deviceModel, timezone } = body;

    if (!token || !fingerprint) {
      await writeLog(kv, 'unknown', '', fingerprint || '', ip, 'denied', 'missing token or fingerprint', request);
      return denyResponse('missing_required_fields', '缺少必要参数', {
        missingFields: ['token', 'fingerprint'].filter((field) => !body[field]),
      }, 400);
    }

    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const tokenIndex = await kv.get(`token_${tokenHash}`, { type: 'json' });
    if (!tokenIndex) {
      await writeLog(kv, 'unknown', '', fingerprint, ip, 'denied', 'token not found', request);
      return denyResponse('invalid_token', 'Token 无效');
    }

    if (tokenIndex.status !== 'active') {
      await writeLog(kv, tokenIndex.appId, '', fingerprint, ip, 'denied', 'token revoked', request);
      return denyResponse('token_revoked', 'Token 已吊销', { status: tokenIndex.status });
    }

    const rawAppData = await kv.get(`app_${tokenIndex.appId}`, { type: 'json' });
    if (!rawAppData) {
      await writeLog(kv, tokenIndex.appId, '', fingerprint, ip, 'denied', 'app not found', request);
      return denyResponse('app_not_found', '应用不存在');
    }

    const appData = hydrateAppData(rawAppData);

    if (appData.status !== 'active') {
      await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'suspended', 'app suspended', request);
      return denyResponse('app_suspended', '应用已暂停', { status: appData.status });
    }

    if (appData.expiresAt && new Date(appData.expiresAt) < new Date()) {
      await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'expired', 'app expired', request);
      return denyResponse('app_expired', '应用已过期', { expiresAt: appData.expiresAt });
    }

    const geoRestrictionStatus = getGeoRestrictionStatus(appData.geoRestriction, request);
    if (!geoRestrictionStatus.allowed) {
      await writeLog(kv, appData.id, appData.name, fingerprint, ip, 'denied', buildGeoRestrictionReason(geoRestrictionStatus), request);
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
      await writeLog(
        kv,
        appData.id,
        appData.name,
        fingerprint,
        ip,
        'denied',
        buildAccessWindowReason(accessWindowStatus),
        request,
      );
      return denyResponse('outside_access_hours', '当前不在开放时段内', {
        timezone: accessWindowStatus.accessWindow.timezone,
        startHour: accessWindowStatus.accessWindow.startHour,
        endHour: accessWindowStatus.accessWindow.endHour,
        currentHour: accessWindowStatus.currentHour,
      });
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
        return denyResponse('device_banned', '设备已封禁');
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
          return denyResponse('max_devices_reached', '设备数已达上限', { limit: appData.maxDevices });
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
    return denyResponse('internal_error', '服务端内部错误', { message: error.message }, 500);
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

function denyResponse(reason, message, detail = {}, status = 200) {
  return jsonResponse({ valid: false, reason, message, detail }, status);
}

async function writeLog(kv, appId, appName, fingerprint, ip, result, reason, request) {
  try {
    const location = getRequestLocation(request);
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
      countryCode: location.countryCode,
      countryName: location.countryName,
      regionCode: location.regionCode,
      regionName: location.regionName,
    };

    await kv.put(logKey, JSON.stringify(logData));
  } catch (error) {
    console.error('[verify] failed to write log', error);
  }
}
