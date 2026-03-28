import {
  getKV,
  hydrateAppData,
  jsonResponse,
  normalizeAccessWindow,
  normalizeExpiresAt,
  normalizeGeoRestriction,
} from '../../_shared.js';

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
    return jsonResponse({ success: true, data: { ...hydrateAppData(appData), token } });
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
    if (updates.accessWindow !== undefined) appData.accessWindow = normalizeAccessWindow(updates.accessWindow);
    if (updates.geoRestriction !== undefined) appData.geoRestriction = normalizeGeoRestriction(updates.geoRestriction);

    await kv.put(`app_${appId}`, JSON.stringify(appData));

    if (updates.status !== undefined) {
      const tokenIndex = await kv.get(`token_${appData.tokenHash}`, { type: 'json' });
      if (tokenIndex) {
        tokenIndex.status = updates.status === 'active' ? 'active' : 'revoked';
        await kv.put(`token_${appData.tokenHash}`, JSON.stringify(tokenIndex));
      }
    }

    const token = await kv.get(`token_plain_${appId}`);
    return jsonResponse({ success: true, data: { ...hydrateAppData(appData), token } });
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
    await deleteLogsForApp(kv, appId);

    const listRaw = (await kv.get('apps_list', { type: 'json' })) || [];
    const newList = listRaw.filter((id) => id !== appId);
    await kv.put('apps_list', JSON.stringify(newList));

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

async function deleteLogsForApp(kv, appId) {
  let cursor;

  do {
    const listOptions = { prefix: 'log_', limit: 256 };
    if (cursor) {
      listOptions.cursor = cursor;
    }

    const listResult = await kv.list(listOptions);
    const keys = Array.isArray(listResult?.keys) ? listResult.keys : [];

    for (const entry of keys) {
      const kvKey = entry?.key ?? entry?.name;
      if (!kvKey) {
        continue;
      }

      const logData = await kv.get(kvKey, { type: 'json' });
      if (logData?.appId === appId) {
        await kv.delete(kvKey);
      }
    }

    cursor = listResult.complete ? undefined : listResult.cursor;
  } while (cursor);
}
