/**
 * GET /api/logs — 日志查询（支持筛选和分页）
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

    const logs = [];

    for (const key of listResult.keys) {
      const logData = await access_logs.get(key.name, { type: 'json' });
      if (!logData) continue;

      // 应用筛选
      if (filterAppId && logData.appId !== filterAppId) continue;
      if (filterResult && logData.result !== filterResult) continue;

      logs.push(logData);
      if (logs.length >= limit) break;
    }

    // 按时间倒序（日志 key 包含时间戳，list 默认字典序 = 时间正序）
    logs.reverse();

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
