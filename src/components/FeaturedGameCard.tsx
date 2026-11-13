import { Link } from 'react-router-dom';
import { Play, Eye } from 'lucide-react';
import type { Game } from '@/types';
import { formatNumber, getImageFallback } from '@/lib/utils';

interface FeaturedGameCardProps {
  game: Game;
}

export default function FeaturedGameCard({ game }: FeaturedGameCardProps) {
  return (
    <Link
      to={`/game/${game.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-dark-border bg-dark-surface shadow-elevated"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
        <img
          src={game.thumbnail || getImageFallback(game.title)}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.03]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getImageFallback(game.title);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <span className="badge mb-3 bg-gradient-to-r from-aqua to-aqua-strong text-dark-bg shadow-glow-sm">
            {game.category_name}
          </span>
          <h2 className="text-2xl font-extrabold text-surface-light drop-shadow-lg sm:text-4xl">{game.title}</h2>
          {game.description && (
            <p className="mt-2 max-w-2xl text-sm text-surface-light/70 line-clamp-2 sm:text-base">
              {game.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4">
            <span className="btn-primary">
              <Play className="h-4 w-4 fill-dark-bg" />
              Play Now
            </span>
            <span className="flex items-center gap-1.5 text-sm text-surface-light/60">
              <Eye className="h-4 w-4 text-aqua" />
              {formatNumber(game.views)} views
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
