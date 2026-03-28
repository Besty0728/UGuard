/**
 * DELETE /api/logs/:logId — 删除单条访问日志
 */

export async function onRequestDelete({ params }) {
  try {
    const { logId } = params;
    if (!logId) {
      return jsonResponse({ success: false, error: '缺少日志 ID' }, 400);
    }

    const key = `log_${logId}`;
    const existing = await ug_guard.get(key);
    if (!existing) {
      return jsonResponse({ success: false, error: '日志不存在' }, 404);
    }

    await ug_guard.delete(key);
    return jsonResponse({ success: true });
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
