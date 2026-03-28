import { getKV, jsonResponse, normalizeExpiresAt } from '../../_shared.js';

export async function onRequestGet(context) {
  try {
    const { params } = context;
    const kv = getKV(context);
    const { appId } = params;

    const appData = await kv.get(`app_${appId}`, { type: 'json' });
    if (!appData) {
      return jsonResponse({ success: false, error: 'app not found' }, 404);
    }

    const token = await kv.get(`token_plain_${appId}`);
    return jsonResponse({ success: true, data: { ...appData, token } });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const { request, params } = context;
    const kv = getKV(context);
    const { appId } = params;

    const appData = await kv.get(`app_${appId}`, { type: 'json' });
    if (!appData) {
      return jsonResponse({ success: false, error: 'app not found' }, 404);
    }

    const updates = await request.json();

    if (updates.name !== undefined) appData.name = updates.name;
    if (updates.status !== undefined) appData.status = updates.status;
    if (updates.maxDevices !== undefined) appData.maxDevices = updates.maxDevices;
    if (updates.logRetention !== undefined) appData.logRetention = updates.logRetention;
    if (updates.expiresAt !== undefined) appData.expiresAt = normalizeExpiresAt(updates.expiresAt);

    await kv.put(`app_${appId}`, JSON.stringify(appData));

    if (updates.status !== undefined) {
      const tokenIndex = await kv.get(`token_${appData.tokenHash}`, { type: 'json' });
      if (tokenIndex) {
        tokenIndex.status = updates.status === 'active' ? 'active' : 'revoked';
        await kv.put(`token_${appData.tokenHash}`, JSON.stringify(tokenIndex));
      }
    }

    const token = await kv.get(`token_plain_${appId}`);
    return jsonResponse({ success: true, data: { ...appData, token } });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { params } = context;
    const kv = getKV(context);
    const { appId } = params;

    const appData = await kv.get(`app_${appId}`, { type: 'json' });
    if (!appData) {
      return jsonResponse({ success: false, error: 'app not found' }, 404);
    }

    await kv.delete(`token_${appData.tokenHash}`);
    await kv.delete(`token_plain_${appId}`);

    const deviceList = (await kv.get(`devices_${appId}`, { type: 'json' })) || [];
    for (const fingerprint of deviceList) {
      await kv.delete(`device_${appId}_${fingerprint}`);
    }
    await kv.delete(`devices_${appId}`);

    await kv.delete(`app_${appId}`);

    const listRaw = (await kv.get('apps_list', { type: 'json' })) || [];
    const newList = listRaw.filter((id) => id !== appId);
    await kv.put('apps_list', JSON.stringify(newList));

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
