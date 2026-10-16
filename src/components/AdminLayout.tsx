import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  Download,
  FolderTree,
  Star,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  BarChart3,
  Flag,
  Users,
  FileText,
  Newspaper,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/games', label: 'Games', icon: Gamepad2, end: false },
  { to: '/admin/import-games', label: 'Import Games', icon: Download, end: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/admin/featured', label: 'Featured Games', icon: Star, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/admin/reports', label: 'Reports', icon: Flag, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/pages', label: 'Pages', icon: FileText, end: false },
  { to: '/admin/news', label: 'News', icon: Newspaper, end: false },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    showToast('Signed out successfully', 'success');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-dark-border bg-dark-surface lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-dark-border px-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aqua">
              <Gamepad2 className="h-4 w-4 text-black" />
            </div>
            <span className="text-lg font-extrabold text-surface-light">
              PLAY<span className="text-aqua">ZI</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-aqua/15 text-aqua'
                    : 'text-surface-light/60 hover:bg-dark-hover hover:text-surface-light'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-dark-border p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-surface-light/60 hover:bg-dark-hover hover:text-surface-light"
          >
            <Home className="h-4 w-4" />
            View Site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-dark-surface lg:hidden animate-slide-up">
            <div className="flex h-16 items-center justify-between border-b border-dark-border px-5">
              <span className="text-lg font-extrabold text-surface-light">
                PLAY<span className="text-aqua">ZI</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="text-surface-light/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-aqua/15 text-aqua'
                        : 'text-surface-light/60 hover:bg-dark-hover hover:text-surface-light'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-dark-border p-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-60">
        {/* Mobile header */}
        <header className="flex h-16 items-center gap-3 border-b border-dark-border bg-dark-surface px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-btn text-surface-light hover:bg-dark-hover"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-extrabold text-surface-light">
            PLAY<span className="text-aqua">ZI</span> Admin
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
