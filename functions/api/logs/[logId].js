import { getKV, jsonResponse } from '../../_shared.js';

export async function onRequestDelete(context) {
  try {
    const { params } = context;
    const kv = getKV(context);
    const { logId } = params;

    if (!logId) {
      return jsonResponse({ success: false, error: 'missing log id' }, 400);
    }

    const key = `log_${logId}`;
    const existing = await kv.get(key);
    if (!existing) {
      return jsonResponse({ success: false, error: 'log not found' }, 404);
    }

    await kv.delete(key);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
