import { getKV, jsonResponse } from '../../../../_shared.js';

export async function onRequestGet(context) {
  try {
    const { params } = context;
    const kv = getKV(context);
    const { appId } = params;

    const appData = await kv.get(`app_${appId}`, { type: 'json' });
    if (!appData) {
      return jsonResponse({ success: false, error: 'app not found' }, 404);
    }

    const deviceList = (await kv.get(`devices_${appId}`, { type: 'json' })) || [];
    const devices = [];

    for (const fingerprint of deviceList) {
      const device = await kv.get(`device_${appId}_${fingerprint}`, { type: 'json' });
      if (device) {
        devices.push(device);
      }
    }

    return jsonResponse({ success: true, data: devices });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
