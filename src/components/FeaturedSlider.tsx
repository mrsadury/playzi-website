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

  // Auto-advance every 6 seconds
  useEffect(() => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(() => {
      goTo(currentIndex + 1);
    }, 6000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [currentIndex, total, goTo]);

  // GIF auto-play: show GIF 2.5s after a card becomes active
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
      }, 2500);
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

  // Touch handlers
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
      className="relative overflow-hidden rounded-card bg-dark-surface"
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slider track */}
      <div
        ref={trackRef}
        className="flex transition-transform duration-500 ease-out"
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
                  className={`h-full w-full object-cover transition-opacity duration-500 ${
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
                    className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-500"
                    onError={() => setShowGifFor(null)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                  <span className="badge bg-aqua/90 text-black mb-3">{game.category_name}</span>
                  <h2 className="text-2xl font-bold text-surface-light sm:text-4xl">{game.title}</h2>
                  {game.description && (
                    <p className="mt-2 max-w-2xl text-sm text-surface-light/70 line-clamp-2 sm:text-base">
                      {game.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4">
                    <Link to={`/game/${game.slug}`} className="btn-primary">
                      <Play className="h-4 w-4 fill-black" />
                      Play Now
                    </Link>
                    <span className="flex items-center gap-1.5 text-sm text-surface-light/60">
                      <Eye className="h-4 w-4" />
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
        className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-surface-light backdrop-blur-sm transition-all hover:bg-aqua hover:text-black md:flex"
        title="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); goNext(); }}
        className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-surface-light backdrop-blur-sm transition-all hover:bg-aqua hover:text-black md:flex"
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
            className={`h-2 rounded-full transition-all ${
              i === currentIndex
                ? 'w-6 bg-aqua'
                : 'w-2 bg-white/40 hover:bg-white/60'
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
      className="group relative block overflow-hidden rounded-card bg-dark-surface"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
        <img
          src={game.thumbnail || getImageFallback(game.title)}
          alt={game.title}
          loading="lazy"
          className={`h-full w-full object-cover transition-opacity duration-500 ${showGif ? 'opacity-0' : 'opacity-100'}`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getImageFallback(game.title);
          }}
        />
        {showGif && game.gif_url && (
          <img
            src={game.gif_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <span className="badge bg-aqua/90 text-black mb-3">{game.category_name}</span>
          <h2 className="text-2xl font-bold text-surface-light sm:text-4xl">{game.title}</h2>
          {game.description && (
            <p className="mt-2 max-w-2xl text-sm text-surface-light/70 line-clamp-2 sm:text-base">
              {game.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4">
            <span className="btn-primary">
              <Play className="h-4 w-4 fill-black" />
              Play Now
            </span>
            <span className="flex items-center gap-1.5 text-sm text-surface-light/60">
              <Eye className="h-4 w-4" />
              {formatNumber(game.views)} views
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
