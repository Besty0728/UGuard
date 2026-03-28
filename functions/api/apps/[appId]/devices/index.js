/**
 * GET /api/apps/:appId/devices — 获取设备列表
 */

export async function onRequestGet({ params }) {
  try {
    const { appId } = params;

    const appData = await ug_guard.get(`app_${appId}`, { type: 'json' });
    if (!appData) {
      return jsonResponse({ success: false, error: '应用不存在' }, 404);
    }

    const deviceList = await ug_guard.get(`devices_${appId}`, { type: 'json' }) || [];
    const devices = [];

    for (const fingerprint of deviceList) {
      const device = await ug_guard.get(`device_${appId}_${fingerprint}`, { type: 'json' });
      if (device) devices.push(device);
    }

    return jsonResponse({ success: true, data: devices });
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
