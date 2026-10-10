import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Eye, Star, CheckCircle2, XCircle, Clock, Download, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game, ImportHistory } from '@/types';
import { formatNumber, timeAgo, formatDate, getImageFallback } from '@/lib/utils';

interface Stats {
  totalGames: number;
  publishedGames: number;
  unpublishedGames: number;
  featuredGames: number;
  totalViews: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [recentImports, setRecentImports] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [allRes, pubRes, featRes, viewsRes, recentRes, importRes] = await Promise.all([
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase.from('games').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('games').select('*', { count: 'exact', head: true }).eq('featured', true),
        supabase.from('games').select('views'),
        supabase.from('games').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('import_history').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalViews = (viewsRes.data || []).reduce((sum, g) => sum + ((g as { views: number }).views || 0), 0);

      setStats({
        totalGames: allRes.count || 0,
        publishedGames: pubRes.count || 0,
        unpublishedGames: (allRes.count || 0) - (pubRes.count || 0),
        featuredGames: featRes.count || 0,
        totalViews,
      });
      setRecentGames((recentRes.data as Game[]) || []);
      setRecentImports((importRes.data as ImportHistory[]) || []);
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Games', value: stats?.totalGames, icon: Gamepad2, color: 'text-aqua', bg: 'bg-aqua/10' },
    { label: 'Published', value: stats?.publishedGames, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Unpublished', value: stats?.unpublishedGames, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Featured', value: stats?.featuredGames, icon: Star, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Total Views', value: stats?.totalViews, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Recent Imports', value: stats ? recentImports.length : 0, icon: Download, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-surface-light">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-28 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-light">Dashboard</h1>
        <p className="text-sm text-surface-light/50">Overview of your PLAYZI platform</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="admin-card p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-light">
                  {card.value !== undefined ? formatNumber(card.value) : '—'}
                </p>
                <p className="text-xs text-surface-light/50">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent games */}
      <div className="mb-8 admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-dark-border px-5 py-4">
          <h2 className="text-lg font-semibold text-surface-light">Recently Added Games</h2>
          <Link to="/admin/games" className="text-sm font-medium text-aqua hover:text-aqua-hover">
            View all
          </Link>
        </div>
        {recentGames.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-surface-light/50">No games yet. Import games to get started.</p>
        ) : (
          <div className="divide-y divide-dark-border">
            {recentGames.map((game) => (
              <div key={game.id} className="flex items-center gap-3 px-5 py-3">
                <img
                  src={game.thumbnail || getImageFallback(game.title)}
                  alt=""
                  className="h-10 w-14 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = getImageFallback(game.title); }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-light">{game.title}</p>
                  <p className="text-xs text-surface-light/50">{game.category_name} - {timeAgo(game.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {game.featured && (
                    <span className="badge bg-gold/15 text-gold"><Star className="h-3 w-3" /> Featured</span>
                  )}
                  <span className={`badge ${game.published ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {game.published ? 'Published' : 'Hidden'}
                  </span>
                  <span className="hidden items-center gap-1 text-xs text-surface-light/50 sm:flex">
                    <Eye className="h-3 w-3" />{formatNumber(game.views)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent imports */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-dark-border px-5 py-4">
          <h2 className="text-lg font-semibold text-surface-light">Recent Import Activity</h2>
          <Link to="/admin/import-games" className="text-sm font-medium text-aqua hover:text-aqua-hover">
            Import games
          </Link>
        </div>
        {recentImports.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-surface-light/50">No imports yet.</p>
        ) : (
          <div className="divide-y divide-dark-border">
            {recentImports.map((imp) => (
              <div key={imp.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aqua/10 text-aqua">
                  <Download className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-light">
                    {imp.new_games} new - {imp.updated_games} updated - {imp.failed} failed
                  </p>
                  <p className="truncate text-xs text-surface-light/50">
                    Pages {imp.start_page}-{imp.end_page} - {formatDate(imp.created_at)}
                  </p>
                </div>
                <span className={`badge ${
                  imp.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                  imp.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                  imp.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-dark-hover text-surface-light/50'
                }`}>
                  {imp.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
