import type { AccessWindow, GeoRestriction } from '@/types';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return '永不过期';
  }

  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;

  return formatDate(dateStr);
}

export function formatAccessWindow(accessWindow?: AccessWindow): string {
  if (!accessWindow?.enabled) {
    return '全天开放';
  }

  return `${padHour(accessWindow.startHour)}:00 - ${padHour(accessWindow.endHour)}:00 (${accessWindow.timezone})`;
}

export function formatGeoRestriction(geoRestriction?: GeoRestriction): string {
  if (!geoRestriction?.enabled) {
    return '不限制地区';
  }

  const countries = geoRestriction.allowedCountries.length > 0 ? geoRestriction.allowedCountries.join(', ') : '任意国家';
  const regions = geoRestriction.allowedRegions.length > 0 ? geoRestriction.allowedRegions.join(', ') : '任意地区';
  return `${countries} / ${regions}`;
}

export function statusText(status: string): string {
  return (
    {
      active: '正常',
      suspended: '已暂停',
      banned: '已封禁',
      allowed: '通过',
      denied: '拒绝',
      expired: '已过期',
      max_devices: '设备超限',
      revoked: '已吊销',
    }[status] ?? status
  );
}

export function statusColor(status: string): string {
  return (
    {
      active: 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-sm',
      allowed: 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-sm',
      suspended: 'bg-amber-50 text-amber-600 border border-amber-200/50 shadow-sm',
      banned: 'bg-red-50 text-red-600 border border-red-200/50 shadow-sm',
      denied: 'bg-red-50 text-red-600 border border-red-200/50 shadow-sm',
      revoked: 'bg-red-50 text-red-600 border border-red-200/50 shadow-sm',
      expired: 'bg-neutral-100 text-neutral-600 border border-neutral-200/50 shadow-sm',
      max_devices: 'bg-orange-50 text-orange-600 border border-orange-200/50 shadow-sm',
    }[status] ?? 'bg-neutral-100 text-neutral-600 border border-neutral-200/50 shadow-sm'
  );
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function padHour(hour: number): string {
  return String(hour).padStart(2, '0');
}
