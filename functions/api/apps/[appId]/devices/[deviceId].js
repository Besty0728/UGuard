import { getKV, jsonResponse } from '../../../../_shared.js';

export async function onRequestPut(context) {
  try {
    const { request, params } = context;
    const kv = getKV(context);
    const { appId, deviceId } = params;
    const updates = await request.json();

    const deviceList = (await kv.get(`devices_${appId}`, { type: 'json' })) || [];

    let targetFingerprint = null;
    let targetDevice = null;

    for (const fingerprint of deviceList) {
      const device = await kv.get(`device_${appId}_${fingerprint}`, { type: 'json' });
      if (device && device.deviceId === deviceId) {
        targetFingerprint = fingerprint;
        targetDevice = device;
        break;
      }
    }

    if (!targetDevice || !targetFingerprint) {
      return jsonResponse({ success: false, error: 'device not found' }, 404);
    }

    if (updates.banned !== undefined) {
      targetDevice.banned = updates.banned;
      targetDevice.bannedAt = updates.banned ? new Date().toISOString() : null;
    }

    if (updates.note !== undefined) {
      targetDevice.note = updates.note;
    }

    await kv.put(`device_${appId}_${targetFingerprint}`, JSON.stringify(targetDevice));

    return jsonResponse({ success: true, data: targetDevice });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
