/**
 * POST /api/user/password — 修改密码
 * 双轨并行：旧密码匹配 KV 密码 或 环境变量密码，任一匹配即可修改
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { oldPassword, newPassword } = await request.json();

    const envPwd = env.ADMIN_SECRET;
    const kvPwd = env.ug_guard ? await env.ug_guard.get('admin_pwd') : null;

    // 二次确认：旧密码必须匹配当前任一有效密码
    if (!oldPassword || (oldPassword !== envPwd && oldPassword !== kvPwd)) {
      return jsonResponse({ success: false, error: '原密码错误' }, 400);
    }

    if (!newPassword || newPassword.length < 6) {
      return jsonResponse({ success: false, error: '新密码无效或过短（少于 6 位）' }, 400);
    }

    // 更新到 KV
    if (env.ug_guard) {
      await env.ug_guard.put('admin_pwd', newPassword);
    } else {
      return jsonResponse({ success: false, error: '未绑定 KV 存储空间 ug_guard' }, 500);
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
