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

    // 从 access_logs KV 中列出日志 key
    const listResult = await access_logs.list({
      prefix: 'log_',
      limit: 256,
      cursor,
    });

    // 收集匹配的日志（保留 KV key 用于可能的清理）
    const allMatched = [];
    for (const key of listResult.keys) {
      const logData = await access_logs.get(key.name, { type: 'json' });
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
        const appData = await app_store.get(`app_${filterAppId}`, { type: 'json' });
        const logRetention = appData?.logRetention;
        if (logRetention > 0 && allMatched.length > logRetention) {
          const toDelete = allMatched.slice(logRetention);
          for (const log of toDelete) {
            await access_logs.delete(log._key);
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
