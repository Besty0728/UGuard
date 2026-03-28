/**
 * POST /api/auth — 验证 Admin Key
 * 双轨并行：KV 密码 或 环境变量密码，任一匹配即通过
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { adminKey } = await request.json();

    const envPwd = env.ADMIN_SECRET;
    const kvPwd = env.ug_guard ? await env.ug_guard.get('admin_pwd') : null;

    if (!adminKey || (adminKey !== envPwd && adminKey !== kvPwd)) {
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
