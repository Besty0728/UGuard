import { useI18n } from '@/contexts/I18nContext';
import { cn, statusColor, statusText } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { language } = useI18n();

  return (
    <span className={cn('inline-flex rounded px-1.5 py-[2px] text-[11px] font-medium tracking-wide', statusColor(status), className)}>
      {statusText(status, language)}
    </span>
  );
}
