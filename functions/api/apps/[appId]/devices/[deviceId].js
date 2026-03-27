/**
 * PUT /api/apps/:appId/devices/:deviceId — 封禁/解封设备
 */

export async function onRequestPut({ request, params }) {
  try {
    const { appId, deviceId } = params;
    const updates = await request.json();

    // 查找设备（需遍历设备列表找到匹配 deviceId 的记录）
    const deviceList = await app_store.get(`devices_${appId}`, { type: 'json' }) || [];

    let targetFingerprint = null;
    let targetDevice = null;

    for (const fingerprint of deviceList) {
      const device = await app_store.get(`device_${appId}_${fingerprint}`, { type: 'json' });
      if (device && device.deviceId === deviceId) {
        targetFingerprint = fingerprint;
        targetDevice = device;
        break;
      }
    }

    if (!targetDevice) {
      return jsonResponse({ success: false, error: '设备不存在' }, 404);
    }

    // 更新封禁状态
    if (updates.banned !== undefined) {
      targetDevice.banned = updates.banned;
      targetDevice.bannedAt = updates.banned ? new Date().toISOString() : null;
    }
    if (updates.note !== undefined) {
      targetDevice.note = updates.note;
    }

    await app_store.put(`device_${appId}_${targetFingerprint}`, JSON.stringify(targetDevice));

    return jsonResponse({ success: true, data: targetDevice });
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
