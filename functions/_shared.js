export function getKV(context) {
  const kv = context?.env?.ug_guard ?? globalThis.ug_guard;

  if (!kv) {
    throw new Error('KV namespace "ug_guard" is not bound');
  }

  return kv;
}

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function normalizeExpiresAt(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid expiresAt value');
  }

  return parsed.toISOString();
}
