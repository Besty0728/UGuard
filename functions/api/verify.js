/**
 * POST /api/verify — Unity 客户端验证入口
 * 不需要 Admin Key，使用 Token 验证
 */

export async function onRequestPost({ request }) {
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For') ||
             'unknown';

  try {
    const body = await request.json();
    const { token, fingerprint, os, unityVersion, deviceModel, timezone } = body;

    if (!token || !fingerprint) {
      await writeLog('unknown', '', fingerprint || '', ip, 'denied', '缺少 token 或 fingerprint', request);
      return jsonResponse({ valid: false, reason: '缺少必要参数' }, 400);
    }

    // 1. Token 哈希 → 查找 Token 索引
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const tokenIndex = await ug_app_store.get(`token_${tokenHash}`, { type: 'json' });

    if (!tokenIndex) {
      await writeLog('unknown', '', fingerprint, ip, 'denied', 'Token 不存在', request);
      return jsonResponse({ valid: false, reason: 'invalid_token' });
    }

    if (tokenIndex.status !== 'active') {
      await writeLog(tokenIndex.appId, '', fingerprint, ip, 'denied', 'Token 已吊销', request);
      return jsonResponse({ valid: false, reason: 'token_revoked' });
    }

    // 2. 查找应用
    const appData = await ug_app_store.get(`app_${tokenIndex.appId}`, { type: 'json' });

    if (!appData) {
      await writeLog(tokenIndex.appId, '', fingerprint, ip, 'denied', '应用不存在', request);
      return jsonResponse({ valid: false, reason: 'app_not_found' });
    }

    // 3. 检查应用状态
    if (appData.status !== 'active') {
      await writeLog(appData.id, appData.name, fingerprint, ip, 'suspended', '应用已暂停', request);
      return jsonResponse({ valid: false, reason: 'app_suspended' });
    }

    // 4. 检查过期
    if (appData.expiresAt && new Date(appData.expiresAt) < new Date()) {
      await writeLog(appData.id, appData.name, fingerprint, ip, 'expired', '应用已过期', request);
      return jsonResponse({ valid: false, reason: 'app_expired' });
    }

    // 5. 对 fingerprint 做 SHA-256（Key 仅允许字母数字下划线）
    const fpHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
    const fpHash = Array.from(new Uint8Array(fpHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // 6. 查找/注册设备
    const deviceKey = `device_${appData.id}_${fpHash}`;
    let device = await ug_app_store.get(deviceKey, { type: 'json' });

    if (device) {
      // 设备已存在 — 检查是否被封禁
      if (device.banned) {
        await writeLog(appData.id, appData.name, fingerprint, ip, 'banned', '设备已封禁', request);
        return jsonResponse({ valid: false, reason: 'device_banned' });
      }

      // 更新最后访问信息
      device.lastSeen = new Date().toISOString();
      device.lastIP = ip;
      device.accessCount += 1;
      await ug_app_store.put(deviceKey, JSON.stringify(device));
    } else {
      // 新设备 — 检查设备数量限制
      if (appData.maxDevices > 0) {
        const deviceList = await ug_app_store.get(`devices_${appData.id}`, { type: 'json' }) || [];
        if (deviceList.length >= appData.maxDevices) {
          await writeLog(appData.id, appData.name, fingerprint, ip, 'max_devices', `设备数已达上限 ${appData.maxDevices}`, request);
          return jsonResponse({ valid: false, reason: 'max_devices_reached' });
        }
      }

      // 生成设备 ID
      const devIdBytes = new Uint8Array(6);
      crypto.getRandomValues(devIdBytes);
      const devId = 'dev_' + Array.from(devIdBytes).map(b => b.toString(16).padStart(2, '0')).join('');

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

      await ug_app_store.put(deviceKey, JSON.stringify(device));

      // 更新设备列表索引
      const deviceList = await ug_app_store.get(`devices_${appData.id}`, { type: 'json' }) || [];
      deviceList.push(fpHash);
      await ug_app_store.put(`devices_${appData.id}`, JSON.stringify(deviceList));
    }

    // 7. 验证通过 — 记录日志（采样：仅记录部分成功日志）
    if (appData.logRetention !== 0 && Math.random() < 0.1) {
      await writeLog(appData.id, appData.name, fingerprint, ip, 'allowed', '', request);
    }

    return jsonResponse({
      valid: true,
      permissions: appData.permissions,
    });
  } catch (e) {
    return jsonResponse({ valid: false, reason: 'internal_error' }, 500);
  }
}

async function writeLog(appId, appName, fingerprint, ip, result, reason, request) {
  try {
    const now = Date.now();
    const randBytes = new Uint8Array(4);
    crypto.getRandomValues(randBytes);
    const rand = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');

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

    await ug_access_logs.put(logKey, JSON.stringify(logData));
  } catch {
    // 日志写入失败不影响主流程
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
