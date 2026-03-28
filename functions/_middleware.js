/**
 * 全局中间件 — Admin Key 校验
 * /api/verify 路径不需要管理员认证（Unity 客户端调用）
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(),
    });
  }

  // /api/verify 不需要 Admin Key
  if (url.pathname === '/api/verify') {
    const response = await context.next();
    return addCors(response);
  }

  // 非 /api/ 路径直接放行（静态资源）
  if (!url.pathname.startsWith('/api/')) {
    return context.next();
  }

  // 校验 Admin Key（双轨并行：KV 密码 或 环境变量密码，任一匹配即通过）
  const adminKey = request.headers.get('X-Admin-Key');
  const envPwd = env.ADMIN_SECRET;
  const kvPwd = env.ug_guard ? await env.ug_guard.get('admin_pwd') : null;

  if (!adminKey || (adminKey !== envPwd && adminKey !== kvPwd)) {
    return jsonResponse({ success: false, error: '未授权' }, 401);
  }

  const response = await context.next();
  return addCors(response);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
  };
}

function addCors(response) {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders())) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
