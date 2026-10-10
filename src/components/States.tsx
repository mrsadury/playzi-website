import { Gamepad2, Search, Compass } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-dark-border bg-dark-card px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-hover text-aqua">
        {icon || <Gamepad2 className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold text-surface-light">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-surface-light/50">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <Compass className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-surface-light">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-surface-light/50">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-4">
          Try Again
        </button>
      )}
    </div>
  );
}

export function SearchResultEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" />}
      title={`No games found for "${query}"`}
      description="Try a different search term or browse categories."
    />
  );
}
