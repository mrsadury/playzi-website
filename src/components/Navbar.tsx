import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, User, LogOut, LayoutDashboard, Gamepad2, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types';
import { getImageFallback } from '@/lib/utils';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestionLoading(true);
    suggestionTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('games')
        .select('id, title, slug, thumbnail, category_name, views')
        .eq('published', true)
        .ilike('title', `%${q}%`)
        .order('views', { ascending: false })
        .limit(5);
      setSuggestions((data as Game[]) || []);
      setShowSuggestions(true);
      setSuggestionLoading(false);
    }, 200);
    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (slug: string) => {
    navigate(`/game/${slug}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const logoImageUrl = settings?.logo_image_url;
  const logoW = settings?.logo_width || 160;
  const logoH = settings?.logo_height || 40;
  const logoOffsetX = settings?.logo_offset_x || 0;
  const logoOffsetY = settings?.logo_offset_y || 0;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-500 ease-smooth ${
        scrolled
          ? 'border-dark-border bg-dark-bg/80 shadow-elevated backdrop-blur-xl'
          : 'border-transparent bg-dark-bg/40 backdrop-blur-md'
      }`}
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Hamburger menu - left side */}
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-btn text-surface-light/70 transition-all duration-300 ease-smooth hover:bg-dark-hover hover:text-aqua active:scale-95"
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Branding logo */}
        <Link to="/" className="flex shrink-0 items-center" style={{ marginLeft: `${logoOffsetX}px`, marginTop: `${logoOffsetY}px` }}>
          {logoImageUrl ? (
            <img
              src={logoImageUrl}
              alt="PLAYZI"
              style={{ width: `${logoW}px`, height: `${logoH}px` }}
              className="object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-aqua to-aqua-strong shadow-glow-sm transition-transform duration-300 hover:scale-105">
                <Gamepad2 className="h-5 w-5 text-dark-bg" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-surface-light">
                PLAY<span className="text-gradient">ZI</span>
              </span>
            </div>
          )}
        </Link>

        {/* Search bar - center/flexible */}
        <form onSubmit={handleSearch} className="ml-auto hidden flex-1 max-w-xs sm:block md:flex md:max-w-sm">
          <div ref={searchWrapperRef} className="group relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40 transition-colors duration-300 group-focus-within:text-aqua" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search games..."
              className="w-full rounded-btn border border-dark-border bg-dark-card/80 py-2 pl-9 pr-4 text-sm text-surface-light placeholder:text-surface-light/40 transition-all duration-300 ease-smooth focus:border-aqua focus:bg-dark-card focus:outline-none focus:ring-2 focus:ring-aqua/20 focus:shadow-glow-sm"
            />
            {showSuggestions && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-btn border border-dark-border bg-dark-card/95 shadow-elevated backdrop-blur-xl animate-scale-in">
                {suggestionLoading ? (
                  <div className="px-4 py-3 text-sm text-surface-light/50">Searching...</div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-surface-light/40">No games found for "{searchQuery}"</div>
                ) : (
                  suggestions.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectSuggestion(g.slug)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-dark-hover"
                    >
                      <img
                        src={g.thumbnail || getImageFallback(g.title)}
                        alt=""
                        className="h-9 w-12 shrink-0 rounded object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = getImageFallback(g.title); }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-light">{g.title}</p>
                        <p className="truncate text-xs text-surface-light/50">{g.category_name}</p>
                      </div>
                      <Search className="h-3.5 w-3.5 shrink-0 text-surface-light/30" />
                    </button>
                  ))
                )}
                {suggestions.length > 0 && (
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1 border-t border-dark-border px-4 py-2.5 text-xs font-medium text-aqua transition-colors duration-200 hover:bg-aqua/10"
                  >
                    See all results for "{searchQuery}"
                  </button>
                )}
              </div>
            )}
          </div>
        </form>

        {/* User profile - right side */}
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-btn border border-dark-border bg-dark-card/80 py-1.5 pl-1.5 pr-3 transition-all duration-300 ease-smooth hover:border-aqua/50 hover:shadow-glow-sm active:scale-95"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-aqua to-aqua-strong text-xs font-bold text-dark-bg">
                    {(profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden text-sm font-medium text-surface-light sm:block">
                  {profile?.username || 'User'}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-btn border border-dark-border bg-dark-card/95 shadow-elevated backdrop-blur-xl animate-scale-in">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-3 text-sm text-surface-light transition-colors duration-200 hover:bg-dark-hover hover:text-aqua">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link to="/favorites" className="flex items-center gap-2 px-4 py-3 text-sm text-surface-light transition-colors duration-200 hover:bg-dark-hover hover:text-aqua">
                      <Heart className="h-4 w-4" /> Favorites
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-3 text-sm text-surface-light transition-colors duration-200 hover:bg-dark-hover hover:text-aqua">
                        <LayoutDashboard className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2 border-t border-dark-border px-4 py-3 text-sm text-error transition-colors duration-200 hover:bg-error/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex h-10 w-10 items-center justify-center rounded-btn border border-dark-border bg-dark-card/80 text-surface-light/70 transition-all duration-300 ease-smooth hover:border-aqua/50 hover:text-aqua hover:shadow-glow-sm active:scale-95"
              title="Login / Sign Up"
            >
              <User className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t border-dark-border px-4 py-2 sm:hidden">
        <form onSubmit={handleSearch}>
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40 transition-colors duration-300 group-focus-within:text-aqua" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-btn border border-dark-border bg-dark-card/80 py-2 pl-9 pr-4 text-sm text-surface-light placeholder:text-surface-light/40 transition-all duration-300 ease-smooth focus:border-aqua focus:outline-none focus:ring-2 focus:ring-aqua/20"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
