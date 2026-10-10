import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  X, Search, Home, Gamepad2, Trophy, Flame, Sparkles,
  Swords, Compass, Car, Trophy as Whistle, Joystick,
  PencilRuler, Puzzle, Crown, Heart, Zap, Target, Shield,
  Dice5, Rocket, Music, Bike, Plane,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('action') || lower.includes('shooter') || lower.includes('fight')) return Swords;
  if (lower.includes('adventure') || lower.includes('rpg')) return Compass;
  if (lower.includes('puzzle') || lower.includes('brain') || lower.includes('logic')) return Puzzle;
  if (lower.includes('racing') || lower.includes('driving') || lower.includes('car')) return Car;
  if (lower.includes('sport') || lower.includes('football') || lower.includes('soccer') || lower.includes('basket')) return Whistle;
  if (lower.includes('arcade') || lower.includes('classic') || lower.includes('retro')) return Joystick;
  if (lower.includes('girls') || lower.includes('dress') || lower.includes('makeover')) return Heart;
  if (lower.includes('kids') || lower.includes('family') || lower.includes('child')) return PencilRuler;
  if (lower.includes('strategy') || lower.includes('board') || lower.includes('chess')) return Target;
  if (lower.includes('multiplayer') || lower.includes('io ') || lower.includes('.io')) return Crown;
  if (lower.includes('defense') || lower.includes('tower') || lower.includes('protect')) return Shield;
  if (lower.includes('idle') || lower.includes('clicker') || lower.includes('incremental')) return Zap;
  if (lower.includes('casino') || lower.includes('card') || lower.includes('poker')) return Dice5;
  if (lower.includes('space') || lower.includes('sci-fi') || lower.includes('alien')) return Rocket;
  if (lower.includes('music') || lower.includes('rhythm') || lower.includes('dance')) return Music;
  if (lower.includes('bike') || lower.includes('bmx') || lower.includes('motorcycle')) return Bike;
  if (lower.includes('flight') || lower.includes('plane') || lower.includes('pilot')) return Plane;
  if (lower.includes('horror') || lower.includes('zombie') || lower.includes('scary')) return Skull;
  return Gamepad2;
}

function Skull(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 20v2h8v-2" />
      <path d="m12.5 17-.5-1-.5 1h1z" />
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
    </svg>
  );
}

interface CategorySidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function CategorySidebar({ open, onClose }: CategorySidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      supabase.from('categories').select('*').eq('visible', true).order('sort_order', { ascending: true }).then(({ data }) => {
        setCategories((data as Category[]) || []);
      });
    }
  }, [open]);

  // Close sidebar on route change - but only when path actually changes
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      onClose();
    }
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      onClose();
    }
  };

  const isCategoryActive = (slug: string) => location.pathname === `/category/${slug}`;

  const quickLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/games', label: 'All Games', icon: Gamepad2 },
    { to: '/popular', label: 'Popular', icon: Flame },
    { to: '/new', label: 'New Games', icon: Sparkles },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isQuickLinkActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-dark-border bg-dark-surface transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-dark-border px-5">
          <span className="text-lg font-extrabold text-surface-light">
            PLAY<span className="text-aqua">ZI</span>
          </span>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-btn text-surface-light/60 transition-colors hover:bg-dark-hover hover:text-surface-light"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-dark-border p-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full rounded-btn border border-dark-border bg-dark-card py-2.5 pl-9 pr-4 text-sm text-surface-light placeholder:text-surface-light/40 focus:border-aqua focus:outline-none focus:ring-1 focus:ring-aqua/30"
              />
            </div>
          </form>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Quick links */}
          <div className="mb-4">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-surface-light/40">Navigation</h3>
            <div className="space-y-1">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                const active = isQuickLinkActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`group flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-aqua/15 text-aqua'
                        : 'text-surface-light/70 hover:bg-dark-hover hover:text-surface-light'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {link.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-aqua" />}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-surface-light/40">Categories</h3>
            {categories.length === 0 ? (
              <p className="px-3 py-4 text-sm text-surface-light/40">Loading categories...</p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.name);
                  const active = isCategoryActive(cat.slug);
                  return (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      className={`group flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? 'bg-aqua/15 text-aqua'
                          : 'text-surface-light/70 hover:bg-dark-hover hover:text-surface-light'
                      }`}
                    >
                      <Icon className={`h-4 w-4 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                      {cat.name}
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-aqua" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
