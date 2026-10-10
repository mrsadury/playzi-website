import { useEffect, useState } from 'react';
import { BarChart3, Eye, Gamepad2, Users, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AnalyticsSummary, Game } from '@/types';
import { formatNumber, formatDate } from '@/lib/utils';

interface CategoryStat {
  category_name: string;
  total_views: number;
  game_count: number;
}

export default function AdminAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topGames, setTopGames] = useState<Game[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [recentViews, setRecentViews] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: summaryData } = await supabase.rpc('get_analytics_summary').maybeSingle();
      if (summaryData) setSummary(summaryData as AnalyticsSummary);

      const { data: topData } = await supabase
        .from('games')
        .select('*')
        .order('views', { ascending: false })
        .limit(10);
      setTopGames((topData as Game[]) || []);

      const { data: catData } = await supabase
        .from('games')
        .select('category_name, views')
        .eq('published', true);
      if (catData) {
        const catMap = new Map<string, CategoryStat>();
        (catData as { category_name: string; views: number }[]).forEach((g) => {
          const key = g.category_name || 'Uncategorized';
          const existing = catMap.get(key) || { category_name: key, total_views: 0, game_count: 0 };
          existing.total_views += g.views || 0;
          existing.game_count += 1;
          catMap.set(key, existing);
        });
        setCategoryStats(Array.from(catMap.values()).sort((a, b) => b.total_views - a.total_views));
      }

      const { data: viewsData } = await supabase
        .from('game_views')
        .select('created_at');
      if (viewsData) {
        const dayMap = new Map<string, number>();
        (viewsData as { created_at: string }[]).forEach((v) => {
          const day = v.created_at.slice(0, 10);
          dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });
        const sorted = Array.from(dayMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-14)
          .map(([date, count]) => ({ date, count }));
        setRecentViews(sorted);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-surface-light text-surface-light">Analytics</h1>
        <div className="shimmer h-96 rounded-card" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Views', value: summary?.total_views || 0, icon: Eye, color: 'text-aqua' },
    { label: 'Total Games', value: summary?.total_games || 0, icon: Gamepad2, color: 'text-blue-500' },
    { label: 'Published', value: summary?.published_games || 0, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Total Users', value: summary?.total_users || 0, icon: Users, color: 'text-gold' },
  ];

  const periodCards = [
    { label: 'Views Today', value: summary?.views_today || 0 },
    { label: 'Views This Week', value: summary?.views_week || 0 },
    { label: 'Views This Month', value: summary?.views_month || 0 },
  ];

  const maxCategoryViews = Math.max(...categoryStats.map((c) => c.total_views), 1);
  const maxDailyViews = Math.max(...recentViews.map((v) => v.count), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-light text-surface-light">
          <BarChart3 className="h-6 w-6 text-aqua" />
          Analytics Dashboard
        </h1>
        <p className="text-sm text-surface-light/50 text-surface-light/60">Real tracked data from game views and user activity</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="admin-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-surface-light text-surface-light">{formatNumber(stat.value)}</p>
            <p className="text-xs text-surface-light/50 text-surface-light/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Period stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {periodCards.map((p) => (
          <div key={p.label} className="admin-card p-4">
            <p className="text-xs text-surface-light/50 text-surface-light/60">{p.label}</p>
            <p className="text-xl font-bold text-surface-light text-surface-light">{formatNumber(p.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily views chart */}
        <div className="admin-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-light text-surface-light">
            <Calendar className="h-5 w-5 text-aqua" />
            Daily Views (Last 14 Days)
          </h2>
          {recentViews.length === 0 ? (
            <p className="py-8 text-center text-sm text-surface-light/50 text-surface-light/50">No view tracking data yet</p>
          ) : (
            <div className="flex items-end gap-1.5" style={{ height: '200px' }}>
              {recentViews.map((v) => (
                <div key={v.date} className="group flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-aqua/60 transition-all hover:bg-aqua"
                    style={{ height: `${(v.count / maxDailyViews) * 100}%`, minHeight: '4px' }}
                    title={`${v.date}: ${v.count} views`}
                  />
                  <span className="text-[8px] text-surface-light/50 text-surface-light/40">
                    {v.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category performance */}
        <div className="admin-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-surface-light text-surface-light">Category Performance</h2>
          {categoryStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-surface-light/50 text-surface-light/50">No category data yet</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.slice(0, 8).map((cat) => (
                <div key={cat.category_name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-surface-light text-surface-light">{cat.category_name}</span>
                    <span className="text-surface-light/50 text-surface-light/60">{formatNumber(cat.total_views)} views / {cat.game_count} games</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-dark-hover bg-black">
                    <div
                      className="h-full rounded-full bg-aqua transition-all"
                      style={{ width: `${(cat.total_views / maxCategoryViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top games table */}
      <div className="admin-card mt-6 overflow-x-auto">
        <div className="p-6 pb-2">
          <h2 className="text-lg font-semibold text-surface-light text-surface-light">Top 10 Most Played Games</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border border-dark-border">
            <tr>
              <th className="px-6 py-3 font-semibold text-surface-light/50 text-surface-light/60">#</th>
              <th className="px-6 py-3 font-semibold text-surface-light/50 text-surface-light/60">Game</th>
              <th className="hidden px-6 py-3 font-semibold text-surface-light/50 sm:table-cell text-surface-light/60">Category</th>
              <th className="px-6 py-3 text-right font-semibold text-surface-light/50 text-surface-light/60">Views</th>
              <th className="hidden px-6 py-3 font-semibold text-surface-light/50 lg:table-cell text-surface-light/60">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle divide-dark-surface">
            {topGames.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-surface-light/50 text-surface-light/50">No games found</td></tr>
            ) : (
              topGames.map((game, i) => (
                <tr key={game.id} className="hover:bg-dark-hover/30 hover:bg-black/40">
                  <td className="px-6 py-3 font-bold text-aqua">{i + 1}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <img src={game.thumbnail || ''} alt="" className="h-8 w-12 rounded object-cover" />
                      <span className="font-medium text-surface-light text-surface-light">{game.title}</span>
                    </div>
                  </td>
                  <td className="hidden px-6 py-3 text-surface-light/50 sm:table-cell text-surface-light/60">{game.category_name}</td>
                  <td className="px-6 py-3 text-right font-medium text-surface-light text-surface-light">{formatNumber(game.views)}</td>
                  <td className="hidden px-6 py-3 text-xs text-surface-light/50 lg:table-cell text-surface-light/60">{formatDate(game.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
