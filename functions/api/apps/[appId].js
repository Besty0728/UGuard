/**
 * GET    /api/apps/:appId — 获取应用详情
 * PUT    /api/apps/:appId — 更新应用
 * DELETE /api/apps/:appId — 删除应用
 */

export async function onRequestGet({ params }) {
  try {
    const { appId } = params;
    const appData = await ug_guard.get(`app_${appId}`, { type: 'json' });

    if (!appData) {
      return jsonResponse({ success: false, error: '应用不存在' }, 404);
    }

    // 附带明文 Token
    const token = await ug_guard.get(`token_plain_${appId}`);
    return jsonResponse({ success: true, data: { ...appData, token } });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}

export async function onRequestPut({ request, params }) {
  try {
    const { appId } = params;
    const appData = await ug_guard.get(`app_${appId}`, { type: 'json' });

    if (!appData) {
      return jsonResponse({ success: false, error: '应用不存在' }, 404);
    }

    const updates = await request.json();

    // 仅允许更新特定字段
    if (updates.name !== undefined) appData.name = updates.name;
    if (updates.status !== undefined) appData.status = updates.status;
    if (updates.maxDevices !== undefined) appData.maxDevices = updates.maxDevices;
    if (updates.logRetention !== undefined) appData.logRetention = updates.logRetention;
    if (updates.expiresAt !== undefined) appData.expiresAt = updates.expiresAt;

    await ug_guard.put(`app_${appId}`, JSON.stringify(appData));

    // 如果暂停应用，同步更新 Token 索引状态
    if (updates.status) {
      const tokenIndex = await ug_guard.get(`token_${appData.tokenHash}`, { type: 'json' });
      if (tokenIndex) {
        tokenIndex.status = updates.status === 'active' ? 'active' : 'revoked';
        await ug_guard.put(`token_${appData.tokenHash}`, JSON.stringify(tokenIndex));
      }
    }

    // 附带明文 Token
    const token = await ug_guard.get(`token_plain_${appId}`);
    return jsonResponse({ success: true, data: { ...appData, token } });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}

export async function onRequestDelete({ params }) {
  try {
    const { appId } = params;
    const appData = await ug_guard.get(`app_${appId}`, { type: 'json' });

    if (!appData) {
      return jsonResponse({ success: false, error: '应用不存在' }, 404);
    }

    // 删除 Token 索引和明文
    await ug_guard.delete(`token_${appData.tokenHash}`);
    await ug_guard.delete(`token_plain_${appId}`);

    // 删除所有设备记录
    const deviceList = await ug_guard.get(`devices_${appId}`, { type: 'json' }) || [];
    for (const fingerprint of deviceList) {
      await ug_guard.delete(`device_${appId}_${fingerprint}`);
    }
    await ug_guard.delete(`devices_${appId}`);

    // 删除应用数据
    await ug_guard.delete(`app_${appId}`);

    // 更新应用列表
    const listRaw = await ug_guard.get('apps_list', { type: 'json' }) || [];
    const newList = listRaw.filter(id => id !== appId);
    await ug_guard.put('apps_list', JSON.stringify(newList));

    return jsonResponse({ success: true });
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
