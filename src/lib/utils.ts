/** 格式化日期为可读字符串 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '永不过期';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 格式化相对时间 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDate(dateStr);
}

/** 状态文本映射 */
export function statusText(status: string): string {
  const map: Record<string, string> = {
    active: '正常',
    suspended: '已暂停',
    revoked: '已吊销',
    banned: '已封禁',
    allowed: '通过',
    denied: '拒绝',
    expired: '已过期',
    max_devices: '设备超限',
  };
  return map[status] ?? status;
}

/** 状态对应的颜色 class */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    allowed: 'bg-green-100 text-green-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    revoked: 'bg-red-100 text-red-800',
    banned: 'bg-red-100 text-red-800',
    denied: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    max_devices: 'bg-orange-100 text-orange-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

/** 截断字符串 */
export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

/** classNames 工具 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
