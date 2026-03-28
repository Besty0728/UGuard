export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-14">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50/50 border border-amber-500/10 flex items-center justify-center mb-4 shadow-sm">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/40">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-dark/80">{title}</p>
      {description && <p className="mt-1 text-[13px] font-medium text-dark/50">{description}</p>}
    </div>
  );
}
