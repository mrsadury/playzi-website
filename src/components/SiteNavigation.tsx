import { Gamepad2, Home, Trophy, UserRound, Wallet as WalletIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navigationItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile#wallet', label: 'Wallet', icon: WalletIcon },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

function isActivePath(pathname: string, hash: string, to: string) {
  if (to === '/') return pathname === '/' && !hash;
  if (to === '/profile#wallet') return pathname === '/profile' && hash === '#wallet';
  if (to === '/profile') return pathname === '/profile' && hash !== '#wallet';
  return pathname.startsWith(to);
}

export default function SiteNavigation() {
  const location = useLocation();

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-dark-card/55 p-1 shadow-card backdrop-blur-xl lg:flex"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(location.pathname, location.hash, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 ease-smooth ${
                active
                  ? 'bg-aqua/15 text-aqua shadow-glow-sm'
                  : 'text-surface-light/55 hover:bg-white/5 hover:text-surface-light'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/10 bg-dark-card/75 p-1.5 shadow-2xl backdrop-blur-2xl lg:hidden"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom))' }}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(location.pathname, location.hash, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-all duration-300 ease-smooth ${
                active
                  ? 'bg-aqua/15 text-aqua'
                  : 'text-surface-light/50 hover:bg-white/5 hover:text-surface-light'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
