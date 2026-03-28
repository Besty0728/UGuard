export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className ?? 'py-20'}`}>
      <div className="w-5 h-5 border-2 border-neutral-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
}
