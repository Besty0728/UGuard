import type { AccessWindow, GeoRestriction } from '@/types';
import { getLocale } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

export function formatDate(dateStr: string | null, language: Language = 'zh'): string {
  if (!dateStr) {
    return language === 'zh' ? '永不过期' : 'Never expires';
  }

  return new Date(dateStr).toLocaleString(getLocale(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr: string, language: Language = 'zh'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return language === 'zh' ? '刚刚' : 'Just now';
  }

  if (minutes < 60) {
    return language === 'zh' ? `${minutes} 分钟前` : `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === 'zh' ? `${hours} 小时前` : `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return language === 'zh' ? `${days} 天前` : `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return formatDate(dateStr, language);
}

export function formatAccessWindow(accessWindow: AccessWindow | undefined, language: Language = 'zh'): string {
  if (!accessWindow?.enabled) {
    return language === 'zh' ? '全天开放' : 'Open all day';
  }

  return `${padHour(accessWindow.startHour)}:00 - ${padHour(accessWindow.endHour)}:00 (${accessWindow.timezone})`;
}

export function formatGeoRestriction(
  geoRestriction: GeoRestriction | undefined,
  language: Language = 'zh',
): string {
  if (!geoRestriction?.enabled) {
    return language === 'zh' ? '不限制地区' : 'No region restriction';
  }

  const countries =
    geoRestriction.allowedCountries.length > 0
      ? geoRestriction.allowedCountries.join(', ')
      : language === 'zh'
        ? '任意国家'
        : 'Any country';
  const regions =
    geoRestriction.allowedRegions.length > 0
      ? geoRestriction.allowedRegions.join(', ')
      : language === 'zh'
        ? '任意地区'
        : 'Any region';

  return `${countries} / ${regions}`;
}

export function statusText(status: string, language: Language = 'zh'): string {
  const labels =
    language === 'zh'
      ? {
          active: '正常',
          suspended: '已暂停',
          banned: '已封禁',
          allowed: '通过',
          denied: '拒绝',
          expired: '已过期',
          max_devices: '设备超限',
          revoked: '已吊销',
        }
      : {
          active: 'Active',
          suspended: 'Suspended',
          banned: 'Banned',
          allowed: 'Allowed',
          denied: 'Denied',
          expired: 'Expired',
          max_devices: 'Limit reached',
          revoked: 'Revoked',
        };

  return labels[status as keyof typeof labels] ?? status;
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
