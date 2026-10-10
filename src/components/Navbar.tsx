import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, User, LogOut, LayoutDashboard, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const logoImageUrl = settings?.logo_image_url;
  const logoW = settings?.logo_width || 160;
  const logoH = settings?.logo_height || 40;
  const logoOffsetX = settings?.logo_offset_x || 0;
  const logoOffsetY = settings?.logo_offset_y || 0;

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? 'bg-black/95 shadow-lg shadow-black/50 backdrop-blur-md'
          : 'bg-black'
      } border-b border-dark-border`}
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Hamburger menu - left side */}
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-btn text-surface-light/80 transition-all hover:bg-dark-hover hover:text-aqua"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aqua">
                <Gamepad2 className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-surface-light">
                PLAY<span className="text-aqua">ZI</span>
              </span>
            </div>
          )}
        </Link>

        {/* Search bar - center/flexible */}
        <form onSubmit={handleSearch} className="ml-auto hidden flex-1 max-w-xs sm:block md:flex md:max-w-sm">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-btn border border-dark-border bg-dark-card py-2 pl-9 pr-4 text-sm text-surface-light placeholder:text-surface-light/40 focus:border-aqua focus:outline-none focus:ring-1 focus:ring-aqua/30"
            />
          </div>
        </form>

        {/* User profile - right side */}
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-btn border border-dark-border bg-dark-card py-1.5 pl-1.5 pr-3 transition-colors hover:border-aqua/50"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-aqua text-xs font-bold text-black">
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-btn border border-dark-border bg-dark-card shadow-xl animate-scale-in">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-3 text-sm text-surface-light hover:bg-dark-hover">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-3 text-sm text-surface-light hover:bg-dark-hover">
                        <LayoutDashboard className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2 border-t border-dark-border px-4 py-3 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary hidden sm:inline-flex">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t border-dark-border px-4 py-2 sm:hidden">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-btn border border-dark-border bg-dark-card py-2 pl-9 pr-4 text-sm text-surface-light placeholder:text-surface-light/40 focus:border-aqua focus:outline-none"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
