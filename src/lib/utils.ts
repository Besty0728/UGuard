/** 格式化日期 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '永不过期';
  return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** 相对时间 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return formatDate(dateStr);
}

/** 状态文本 */
export function statusText(s: string): string {
  return { active: '正常', suspended: '已暂停', banned: '已封禁', allowed: '通过', denied: '拒绝', expired: '已过期', max_devices: '设备超限', revoked: '已吊销' }[s] ?? s;
}

/** 状态样式 */
export function statusColor(s: string): string {
  return {
    active: 'bg-emerald-50 text-emerald-600',
    allowed: 'bg-emerald-50 text-emerald-600',
    suspended: 'bg-amber-50 text-amber-600',
    banned: 'bg-red-50 text-red-600',
    denied: 'bg-red-50 text-red-600',
    revoked: 'bg-red-50 text-red-600',
    expired: 'bg-gray-100 text-gray-500',
    max_devices: 'bg-orange-50 text-orange-600',
  }[s] ?? 'bg-gray-100 text-gray-500';
}

export function cn(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}
