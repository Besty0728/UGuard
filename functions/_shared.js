export const DEFAULT_ACCESS_WINDOW = Object.freeze({
  enabled: false,
  startHour: 9,
  endHour: 18,
  timezone: 'Asia/Shanghai',
});

export const DEFAULT_GEO_RESTRICTION = Object.freeze({
  enabled: false,
  allowedCountries: [],
  allowedRegions: [],
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
    geoRestriction: normalizeGeoRestriction(appData.geoRestriction),
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

export function normalizeGeoRestriction(value) {
  const raw = value ?? DEFAULT_GEO_RESTRICTION;
  const enabled = Boolean(raw.enabled);
  const allowedCountries = normalizeStringList(raw.allowedCountries, true);
  const allowedRegions = normalizeStringList(raw.allowedRegions, true);

  return {
    enabled,
    allowedCountries,
    allowedRegions,
  };
}

export function getGeoRestrictionStatus(geoRestriction, request) {
  const normalized = normalizeGeoRestriction(geoRestriction);
  const location = getRequestLocation(request);

  if (!normalized.enabled) {
    return {
      allowed: true,
      geoRestriction: normalized,
      location,
    };
  }

  const countryAllowed =
    normalized.allowedCountries.length === 0 ||
    (location.countryCode && normalized.allowedCountries.includes(location.countryCode));
  const regionAllowed =
    normalized.allowedRegions.length === 0 ||
    (location.regionCode && normalized.allowedRegions.includes(location.regionCode)) ||
    (location.regionName && normalized.allowedRegions.includes(location.regionName.toUpperCase()));

  return {
    allowed: countryAllowed && regionAllowed,
    geoRestriction: normalized,
    location,
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

function normalizeStringList(value, uppercase = false) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((item) => (uppercase ? item.toUpperCase() : item));

  return [...new Set(normalized)];
}

function getRequestLocation(request) {
  const geo = request?.eo?.geo ?? {};
  const countryCode =
    normalizeLocationValue(geo.countryCodeAlpha2, true) ||
    normalizeLocationValue(request.headers.get('EO-Country-Code'), true) ||
    normalizeLocationValue(request.headers.get('X-Geo-Country'), true);
  const countryName =
    normalizeLocationValue(geo.countryName, false) ||
    normalizeLocationValue(request.headers.get('EO-Country-Name'), false);
  const regionCode =
    normalizeLocationValue(geo.regionCode, true) ||
    normalizeLocationValue(request.headers.get('EO-Region-Code'), true) ||
    normalizeLocationValue(request.headers.get('X-Geo-Region'), true);
  const regionName =
    normalizeLocationValue(geo.regionName, false) ||
    normalizeLocationValue(request.headers.get('EO-Region-Name'), false);

  return {
    countryCode,
    countryName,
    regionCode,
    regionName,
  };
}

function normalizeLocationValue(value, uppercase) {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  return uppercase ? normalized.toUpperCase() : normalized;
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
