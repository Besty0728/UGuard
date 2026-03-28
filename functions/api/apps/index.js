/**
 * GET  /api/apps — 获取应用列表
 * POST /api/apps — 创建应用
 */

export async function onRequestGet() {
  try {
    const listRaw = await ug_app_store.get('apps_list', { type: 'json' });
    const appIds = listRaw || [];

    const apps = [];
    for (const id of appIds) {
      const appData = await ug_app_store.get(`app_${id}`, { type: 'json' });
      if (appData) apps.push(appData);
    }

    return jsonResponse({ success: true, data: apps });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}

export async function onRequestPost({ request }) {
  try {
    const { name, maxDevices = 5, expiresAt = null } = await request.json();

    if (!name || typeof name !== 'string') {
      return jsonResponse({ success: false, error: '应用名称不能为空' }, 400);
    }

    // 生成 App ID
    const idBytes = new Uint8Array(8);
    crypto.getRandomValues(idBytes);
    const appId = Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // 生成 Token: sk_<64 hex chars>
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const tokenHex = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const token = `sk_${tokenHex}`;

    // SHA-256 哈希
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const now = new Date().toISOString();

    const appData = {
      id: appId,
      name,
      tokenHash,
      status: 'active',
      createdAt: now,
      expiresAt: expiresAt || null,
      maxDevices: maxDevices || 0,
      logRetention: -1,
      permissions: { features: ['full'] },
    };

    // 存储应用数据
    await ug_app_store.put(`app_${appId}`, JSON.stringify(appData));

    // 存储 Token 反查索引
    await ug_app_store.put(`token_${tokenHash}`, JSON.stringify({
      appId,
      status: 'active',
    }));

    // 存储明文 Token（管理员可反复查看）
    await ug_app_store.put(`token_plain_${appId}`, token);

    // 更新应用列表索引
    const listRaw = await ug_app_store.get('apps_list', { type: 'json' });
    const appIds = listRaw || [];
    appIds.push(appId);
    await ug_app_store.put('apps_list', JSON.stringify(appIds));

    // 初始化设备列表索引
    await ug_app_store.put(`devices_${appId}`, JSON.stringify([]));

    return jsonResponse({
      success: true,
      data: { app: appData, token },
    });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
