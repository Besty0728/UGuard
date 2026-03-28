/**
 * GET /api/logs — 日志查询（支持筛选和分页）
 * 若指定 appId 且该应用 logRetention > 0，查询时自动清理超出部分的旧日志
 */

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const filterAppId = url.searchParams.get('appId') || '';
    const filterResult = url.searchParams.get('result') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 256);
    const cursor = url.searchParams.get('cursor') || undefined;

    // 从 ug_guard KV 中列出日志 key
    const listOpts = { prefix: 'log_', limit: 256 };
    if (cursor) listOpts.cursor = cursor;
    const listResult = await ug_guard.list(listOpts);

    // 收集匹配的日志（保留 KV key 用于可能的清理）
    const keys = Array.isArray(listResult?.keys) ? listResult.keys : [];
    const allMatched = [];
    for (const key of keys) {
      const logData = await ug_guard.get(key.name, { type: 'json' });
      if (!logData) continue;
      if (filterAppId && logData.appId !== filterAppId) continue;
      if (filterResult && logData.result !== filterResult) continue;
      allMatched.push({ ...logData, _key: key.name });
    }

    // 按时间倒序
    allMatched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 日志清理：若指定了 appId 且该应用设置了保留条数上限
    if (filterAppId && allMatched.length > 0) {
      try {
        const appData = await ug_guard.get(`app_${filterAppId}`, { type: 'json' });
        const logRetention = appData?.logRetention;
        if (logRetention > 0 && allMatched.length > logRetention) {
          const toDelete = allMatched.slice(logRetention);
          for (const log of toDelete) {
            await ug_guard.delete(log._key);
          }
        }
      } catch {
        // 清理失败不影响查询
      }
    }

    // 移除内部 _key 字段，截取请求的数量
    const logs = allMatched.slice(0, limit).map(({ _key, ...log }) => log);

    return jsonResponse({
      success: true,
      data: {
        logs,
        cursor: listResult.complete ? undefined : listResult.cursor,
      },
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
