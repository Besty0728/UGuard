export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-14">
      <div className="mx-auto w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
      </div>
      <p className="text-sm text-neutral-400">{title}</p>
      {description && <p className="mt-1 text-xs text-neutral-300">{description}</p>}
    </div>
  );
}
