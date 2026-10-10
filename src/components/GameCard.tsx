import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye } from 'lucide-react';
import type { Game } from '@/types';
import { formatNumber, getImageFallback } from '@/lib/utils';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const [showGif, setShowGif] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(false);
  const [gifError, setGifError] = useState(false);
  const gifRef = useRef<HTMLImageElement>(null);

  const hasGif = !!game.gif_url;
  const canShowGif = hasGif && showGif && !gifError;

  const handleEnter = () => {
    if (hasGif) setShowGif(true);
  };

  const handleLeave = () => {
    setShowGif(false);
  };

  const handleClick = () => {
    if (hasGif && !showGif) {
      setShowGif(true);
    }
  };

  return (
    <Link
      to={`/game/${game.slug}`}
      className="group block overflow-hidden rounded-card border border-dark-border bg-dark-card transition-all hover:border-aqua hover:shadow-lg hover:shadow-aqua/10"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-surface">
        {/* Thumbnail (always present, underneath GIF) */}
        <img
          src={game.thumbnail || getImageFallback(game.title)}
          alt={game.title}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            canShowGif && gifLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getImageFallback(game.title);
          }}
        />
        {/* GIF overlay (lazy-loaded on hover/tap) */}
        {canShowGif && (
          <img
            ref={gifRef}
            src={game.gif_url!}
            alt=""
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              gifLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setGifLoaded(true)}
            onError={() => setGifError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-aqua/90 shadow-lg backdrop-blur-sm">
            <Play className="h-5 w-5 fill-black text-black" />
          </div>
        </div>
        {game.featured && (
          <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
            FEATURED
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-surface-light">{game.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-surface-light/50">{game.category_name}</span>
          <span className="flex items-center gap-1 text-xs text-surface-light/50">
            <Eye className="h-3 w-3" />
            {formatNumber(game.views)}
          </span>
        </div>
      </div>
    </Link>
  );
}
