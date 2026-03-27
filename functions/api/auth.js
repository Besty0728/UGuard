/**
 * POST /api/auth — 验证 Admin Key
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { adminKey } = await request.json();

    if (!adminKey || adminKey !== env.ADMIN_SECRET) {
      return jsonResponse({ success: false, error: '密钥无效' }, 401);
    }

    return jsonResponse({ success: true });
  } catch {
    return jsonResponse({ success: false, error: '请求格式错误' }, 400);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
