import { statusText, statusColor, cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(status), className)}>
      {statusText(status)}
    </span>
  );
}
