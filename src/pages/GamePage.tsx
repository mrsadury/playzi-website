import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Play, Maximize, Minimize, Eye, Gamepad2, Tag, X, Flag, RotateCw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Game } from '@/types';
import { getSessionKey, formatNumber, formatDate, getImageFallback } from '@/lib/utils';
import { addRecentlyPlayed } from '@/lib/recentlyPlayed';
import GameGrid from '@/components/GameGrid';
import SectionHeader from '@/components/SectionHeader';
import { HeroSkeleton, GameGridSkeleton } from '@/components/Skeletons';
import { EmptyState, ErrorState } from '@/components/States';
import Modal from '@/components/Modal';

export default function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [related, setRelated] = useState<Game[]>([]);
  const [popular, setPopular] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportDesc, setReportDesc] = useState('');
  const [reporting, setReporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionKeyRef = useRef<string>('');

  // Fetch game data
  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      setIframeLoading(true);
      setIframeError(false);
      setTracked(false);

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const g = data as Game;
      setGame(g);
      setLoading(false);

      if (g.category_id) {
        const { data: relData } = await supabase
          .from('games')
          .select('*')
          .eq('published', true)
          .eq('category_id', g.category_id)
          .neq('id', g.id)
          .order('views', { ascending: false })
          .limit(6);
        setRelated((relData as Game[]) || []);
      } else {
        const { data: relData } = await supabase
          .from('games')
          .select('*')
          .eq('published', true)
          .neq('id', g.id)
          .order('views', { ascending: false })
          .limit(6);
        setRelated((relData as Game[]) || []);
      }

      const { data: popData } = await supabase
        .from('games')
        .select('*')
        .eq('published', true)
        .neq('id', g.id)
        .order('views', { ascending: false })
        .limit(6);
      setPopular((popData as Game[]) || []);
    })();
  }, [slug]);

  // Track game view (once per session per game) and update local view count
  useEffect(() => {
    if (game && !tracked) {
      setTracked(true);
      const sessionKey = getSessionKey();
      addRecentlyPlayed(game);
      supabase.rpc('increment_game_view', {
        p_game_id: game.id,
        p_session_key: sessionKey,
        p_user_id: user?.id || null,
      }).then(({ data }) => {
        if (data === true) {
          setGame((prev) => prev ? { ...prev, views: prev.views + 1 } : prev);
        }
      });
    }
  }, [game, tracked, user]);

  // Start gameplay session for logged-in users
  useEffect(() => {
    if (!game || !user) return;
    const sKey = getSessionKey();
    sessionKeyRef.current = sKey;

    let cancelled = false;
    (async () => {
      const { data: sid } = await supabase.rpc('start_gameplay_session', {
        p_game_id: game.id,
        p_session_key: sKey,
      });
      if (!cancelled && sid) {
        sessionIdRef.current = sid as string;
      }
    })();

    return () => {
      cancelled = true;
      if (sessionIdRef.current) {
        supabase.rpc('end_gameplay_session', {
          p_session_id: sessionIdRef.current,
          p_session_key: sKey,
        });
        sessionIdRef.current = null;
      }
    };
  }, [game, user]);

  // Pause session when tab is hidden, resume when visible
  useEffect(() => {
    if (!user || !sessionIdRef.current) return;

    const handleVisibility = () => {
      if (document.hidden && sessionIdRef.current) {
        supabase.rpc('end_gameplay_session', {
          p_session_id: sessionIdRef.current,
          p_session_key: sessionKeyRef.current,
        }).then(() => {
          sessionIdRef.current = null;
        });
      } else if (!document.hidden && game) {
        const sKey = sessionKeyRef.current;
        (async () => {
          const { data: sid } = await supabase.rpc('start_gameplay_session', {
            p_game_id: game.id,
            p_session_key: sKey,
          });
          if (sid) sessionIdRef.current = sid as string;
        })();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, game]);

  const handleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
    const el = container as HTMLElement & { webkitRequestFullscreen?: () => void };

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      // Enter fullscreen
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } catch {
        // Fullscreen may require user gesture - ignore errors
      }
    } else {
      // Exit fullscreen
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const fs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(fs);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const submitReport = async () => {
    if (!game) return;
    setReporting(true);
    const { error } = await supabase.from('game_reports').insert({
      game_id: game.id,
      reporter_id: user?.id || null,
      reporter_name: profile?.username || user?.email || 'Anonymous',
      reason: reportReason,
      description: reportDesc.trim() || null,
    });
    setReporting(false);
    if (error) {
      showToast('Failed to submit report', 'error');
    } else {
      showToast('Report submitted. Thank you!', 'success');
      setShowReport(false);
      setReportDesc('');
      setReportReason('inappropriate');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <HeroSkeleton />
        <div className="mt-8">
          <GameGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (notFound || !game) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title="Game not found"
          description="This game may have been removed or is no longer available."
          action={<Link to="/games" className="btn-primary">Browse Games</Link>}
        />
      </div>
    );
  }

  const aspectRatio = game.width && game.height ? `${game.width} / ${game.height}` : '16 / 9';
  const isPortraitGame = game.width && game.height && game.height > game.width;

  const containerStyle: CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 9999, borderRadius: 0, aspectRatio: 'unset' }
    : {};

  const iframeWrapperStyle: CSSProperties = isFullscreen
    ? { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }
    : { aspectRatio };

  const iframeStyle: CSSProperties = isFullscreen
    ? {
        border: 'none',
        display: 'block',
        width: '100%',
        height: '100%',
        maxWidth: isPortraitGame ? '480px' : 'none',
        margin: '0 auto',
      }
    : { border: 'none', display: 'block', width: '100%', height: '100%' };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-surface-light/60">
        <Link to="/" className="hover:text-aqua">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/games" className="hover:text-aqua">Games</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/category/${game.category_name.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-aqua">
          {game.category_name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-surface-light">{game.title}</span>
      </nav>

      {/* Title and views */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">{game.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-surface-light/60">
            <span className="badge bg-dark-surface text-aqua">{game.category_name}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(game.views)} views
            </span>
            <span>Added {formatDate(game.created_at)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1 rounded-btn px-3 py-2 text-sm text-surface-light/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Report this game"
        >
          <Flag className="h-4 w-4" />
          <span className="hidden sm:inline">Report</span>
        </button>
      </div>

      {/* Game Player */}
      <div
        ref={containerRef}
        id="game-player-container"
        className={`relative mb-6 overflow-hidden border border-dark-border bg-black ${
          isFullscreen ? 'rounded-none' : 'rounded-card'
        }`}
        style={containerStyle}
      >
        <div className="relative w-full" style={iframeWrapperStyle}>
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-surface">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-aqua border-t-transparent" />
                <p className="text-sm text-surface-light/60">Loading game...</p>
              </div>
            </div>
          )}
          {iframeError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-dark-surface p-6 text-center">
              <ErrorState
                title="Unable to load game"
                description="This game may be temporarily unavailable. Try refreshing the page."
              />
              <button onClick={() => {
                setIframeLoading(true);
                setIframeError(false);
              }} className="btn-primary">
                <RotateCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : (
            <iframe
              id="game-iframe"
              src={game.game_url}
              title={game.title}
              className="h-full w-full"
              style={iframeStyle}
              allow="autoplay; fullscreen; gamepad; geolocation; microphone; camera; accelerometer; gyroscope; orientation-lock"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-orientation-lock allow-modals"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setIframeError(true);
              }}
            />
          )}

          {/* Player controls bar - fullscreen toggle only */}
          <div className={`absolute right-3 z-10 flex gap-2 ${isFullscreen ? 'top-3' : 'bottom-3'}`}>
            <button
              onClick={handleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-btn bg-black/80 text-surface-light backdrop-blur-sm transition-all hover:bg-aqua hover:text-black"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
            {isFullscreen && (
              <button
                onClick={handleFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-btn bg-red-500/80 text-white backdrop-blur-sm transition-all hover:bg-red-600"
                title="Exit fullscreen"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {iframeLoading && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-aqua/20 backdrop-blur-sm">
                <Play className="h-7 w-7 fill-aqua text-aqua" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {game.description && (
        <div className="mb-8 card p-5">
          <h2 className="mb-2 text-lg font-semibold text-surface-light">About this game</h2>
          <p className="text-sm leading-relaxed text-surface-light/60">{game.description}</p>
        </div>
      )}

      {/* Tags */}
      {game.tags && game.tags.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-surface-light/60">
            <Tag className="h-4 w-4" /> Tags:
          </span>
          {game.tags.map((tag, i) => (
            <Link
              key={i}
              to={`/games?q=${encodeURIComponent(tag)}`}
              className="badge bg-dark-surface text-surface-light/60 hover:bg-aqua hover:text-black"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Related games */}
      {related.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Related Games" />
          <GameGrid games={related} columns={6} />
        </section>
      )}

      {/* Popular games */}
      {popular.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Popular Games" linkTo="/popular" />
          <GameGrid games={popular} columns={6} />
        </section>
      )}

      {/* Report modal */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Report Game" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-light/60">
            Help us keep PLAYZI safe. Report games that are broken, inappropriate, or violate our policies.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Reason</label>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="input-field cursor-pointer">
              <option value="inappropriate">Inappropriate content</option>
              <option value="broken">Game not working / broken</option>
              <option value="spam">Spam or misleading</option>
              <option value="copyright">Copyright violation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Description (optional)</label>
            <textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Provide additional details..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowReport(false)} className="btn-secondary">Cancel</button>
            <button onClick={submitReport} disabled={reporting} className="btn-danger">
              {reporting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
