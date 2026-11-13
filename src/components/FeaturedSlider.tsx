import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Eye } from 'lucide-react';
import type { Game } from '@/types';
import { formatNumber, getImageFallback } from '@/lib/utils';

interface FeaturedSliderProps {
  games: Game[];
}

export default function FeaturedSlider({ games }: FeaturedSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGifFor, setShowGifFor] = useState<string | null>(null);

  const total = games.length;

  const goTo = useCallback((index: number) => {
    if (total === 0) return;
    const normalized = ((index % total) + total) % total;
    setCurrentIndex(normalized);
  }, [total]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(() => {
      goTo(currentIndex + 1);
    }, 6000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [currentIndex, total, goTo]);

  useEffect(() => {
    if (gifTimerRef.current) {
      clearTimeout(gifTimerRef.current);
      gifTimerRef.current = null;
    }
    setShowGifFor(null);

    const activeGame = games[currentIndex];
    if (activeGame?.gif_url) {
      gifTimerRef.current = setTimeout(() => {
        setShowGifFor(activeGame.id);
      }, 1500);
    }

    return () => {
      if (gifTimerRef.current) {
        clearTimeout(gifTimerRef.current);
        gifTimerRef.current = null;
      }
    };
  }, [currentIndex, games]);

  const pauseAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  };
  const resumeAutoPlay = () => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(() => {
      goTo(currentIndex + 1);
    }, 6000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
    pauseAutoPlay();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const minSwipe = 50;

    if (distance > minSwipe) {
      goNext();
    } else if (distance < -minSwipe) {
      goPrev();
    }

    setTouchStart(null);
    setTouchEnd(null);
    resumeAutoPlay();
  };

  if (total === 0) return null;
  if (total === 1) {
    return <SingleFeaturedCard game={games[0]} showGif={showGifFor === games[0].id} />;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-surface shadow-elevated"
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slider track */}
      <div
        ref={trackRef}
        className="flex transition-transform duration-700 ease-smooth"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {games.map((game) => {
          const isActive = games[currentIndex].id === game.id;
          const showGif = isActive && showGifFor === game.id && !!game.gif_url;
          return (
            <div key={game.id} className="relative w-full shrink-0">
              <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
                <img
                  src={game.thumbnail || getImageFallback(game.title)}
                  alt={game.title}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-opacity duration-700 ${
                    showGif ? 'opacity-0' : 'opacity-100'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getImageFallback(game.title);
                  }}
                />
                {showGif && (
                  <img
                    src={game.gif_url!}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-700"
                    onError={() => setShowGifFor(null)}
                  />
                )}
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
                    <Link to={`/game/${game.slug}`} className="btn-primary group">
                      <Play className="h-4 w-4 fill-dark-bg transition-transform duration-300 group-hover:scale-110" />
                      Play Now
                    </Link>
                    <span className="flex items-center gap-1.5 text-sm text-surface-light/60">
                      <Eye className="h-4 w-4 text-aqua" />
                      {formatNumber(game.views)} views
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows - desktop */}
      <button
        onClick={(e) => { e.preventDefault(); goPrev(); }}
        className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-dark-bg/60 text-surface-light backdrop-blur-md transition-all duration-300 ease-smooth hover:border-aqua/50 hover:bg-aqua hover:text-dark-bg hover:shadow-glow active:scale-90 md:flex"
        title="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); goNext(); }}
        className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-dark-bg/60 text-surface-light backdrop-blur-md transition-all duration-300 ease-smooth hover:border-aqua/50 hover:bg-aqua hover:text-dark-bg hover:shadow-glow active:scale-90 md:flex"
        title="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {games.map((game, i) => (
          <button
            key={game.id}
            onClick={(e) => { e.preventDefault(); goTo(i); }}
            className={`h-2 rounded-full transition-all duration-300 ease-smooth ${
              i === currentIndex
                ? 'w-6 bg-gradient-to-r from-aqua to-aqua-strong shadow-glow-sm'
                : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            title={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function SingleFeaturedCard({ game, showGif }: { game: Game; showGif: boolean }) {
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
          className={`h-full w-full object-cover transition-all duration-700 ease-smooth group-hover:scale-[1.03] ${showGif ? 'opacity-0' : 'opacity-100'}`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getImageFallback(game.title);
          }}
        />
        {showGif && game.gif_url && (
          <img
            src={game.gif_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-700"
          />
        )}
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
