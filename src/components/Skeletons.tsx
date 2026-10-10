export function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-dark-border">
      <div className="shimmer aspect-[4/3] w-full" />
      <div className="p-3">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer mt-2 h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function GameGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-card">
      <div className="shimmer aspect-[16/9] w-full sm:aspect-[21/9]" />
    </div>
  );
}
