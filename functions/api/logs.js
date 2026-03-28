import { getKV, jsonResponse } from '../_shared.js';

export async function onRequestGet(context) {
  try {
    const { request } = context;
    const kv = getKV(context);
    const url = new URL(request.url);
    const filterAppId = url.searchParams.get('appId') || '';
    const filterResult = url.searchParams.get('result') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 256);
    const cursor = url.searchParams.get('cursor') || undefined;

    const listOptions = { prefix: 'log_', limit: 256 };
    if (cursor) {
      listOptions.cursor = cursor;
    }

    const listResult = await kv.list(listOptions);
    const keys = Array.isArray(listResult?.keys) ? listResult.keys : [];
    const allMatched = [];

    for (const entry of keys) {
      const kvKey = entry?.key ?? entry?.name;
      if (!kvKey) {
        continue;
      }

      const logData = await kv.get(kvKey, { type: 'json' });
      if (!logData) {
        continue;
      }
      if (filterAppId && logData.appId !== filterAppId) {
        continue;
      }
      if (filterResult && logData.result !== filterResult) {
        continue;
      }
      allMatched.push({ ...logData, _key: kvKey });
    }

    allMatched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filterAppId && allMatched.length > 0) {
      try {
        const appData = await kv.get(`app_${filterAppId}`, { type: 'json' });
        const logRetention = appData?.logRetention;
        if (logRetention > 0 && allMatched.length > logRetention) {
          const toDelete = allMatched.slice(logRetention);
          for (const log of toDelete) {
            await kv.delete(log._key);
          }
        }
      } catch {
        // Cleanup failure should not block log queries.
      }
    }

    const logs = allMatched.slice(0, limit).map(({ _key, ...log }) => log);

    return jsonResponse({
      success: true,
      data: {
        logs,
        cursor: listResult.complete ? undefined : listResult.cursor,
      },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
