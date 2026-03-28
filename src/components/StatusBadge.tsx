import { statusText, statusColor, cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex px-1.5 py-[2px] rounded text-[11px] font-medium tracking-wide', statusColor(status), className)}>
      {statusText(status)}
    </span>
  );
}
