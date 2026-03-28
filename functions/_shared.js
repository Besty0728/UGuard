export const DEFAULT_ACCESS_WINDOW = Object.freeze({
  enabled: false,
  startHour: 9,
  endHour: 18,
  timezone: 'Asia/Shanghai',
});

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

export function normalizeAccessWindow(value) {
  const raw = value ?? DEFAULT_ACCESS_WINDOW;
  const enabled = Boolean(raw.enabled);
  const startHour = normalizeHour(raw.startHour ?? DEFAULT_ACCESS_WINDOW.startHour, 'startHour', 0, 23);
  const endHour = normalizeHour(raw.endHour ?? DEFAULT_ACCESS_WINDOW.endHour, 'endHour', 1, 24);
  const timezone = normalizeTimeZone(raw.timezone ?? DEFAULT_ACCESS_WINDOW.timezone);

  if (enabled && startHour === endHour) {
    throw new Error('startHour and endHour cannot be the same when accessWindow is enabled');
  }

  return {
    enabled,
    startHour,
    endHour,
    timezone,
  };
}

export function hydrateAppData(appData) {
  if (!appData) {
    return appData;
  }

  return {
    ...appData,
    accessWindow: normalizeAccessWindow(appData.accessWindow),
  };
}

export function getAccessWindowStatus(accessWindow, now = new Date()) {
  const normalized = normalizeAccessWindow(accessWindow);

  if (!normalized.enabled) {
    return {
      open: true,
      currentHour: null,
      accessWindow: normalized,
    };
  }

  const currentHour = getHourInTimezone(normalized.timezone, now);
  const open =
    normalized.startHour < normalized.endHour
      ? currentHour >= normalized.startHour && currentHour < normalized.endHour
      : currentHour >= normalized.startHour || currentHour < normalized.endHour;

  return {
    open,
    currentHour,
    accessWindow: normalized,
  };
}

function normalizeHour(value, name, min, max) {
  const hour = Number(value);

  if (!Number.isInteger(hour) || hour < min || hour > max) {
    throw new Error(`Invalid ${name} value`);
  }

  return hour;
}

function normalizeTimeZone(value) {
  const timezone = String(value).trim();

  if (!timezone) {
    throw new Error('Invalid timezone value');
  }

  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error('Invalid timezone value');
  }

  return timezone;
}

function getHourInTimezone(timezone, now) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: timezone,
    }).format(now),
  );
}
