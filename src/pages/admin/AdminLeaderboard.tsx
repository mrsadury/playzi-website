import { useEffect, useState } from 'react';
import { Trophy, Clock, Gamepad2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LeaderboardRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_playtime_seconds: number;
  games_played: number;
  rank_value: number;
}

function formatPlaytime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return `${hours}h ${remMin}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function AdminLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 100 });
    if (!error && data) {
      setRows(data as LeaderboardRow[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-surface-light">Leaderboard Management</h1>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer h-14 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const totalPlaytime = rows.reduce((s, r) => s + r.total_playtime_seconds, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-light">Leaderboard Management</h1>
          <p className="text-sm text-surface-light/50">View player ranking data based on gameplay time</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="admin-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-light">{rows.length}</p>
              <p className="text-xs text-surface-light/50">Ranked Players</p>
            </div>
          </div>
        </div>
        <div className="admin-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-aqua/10 text-aqua">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-light">{formatPlaytime(totalPlaytime)}</p>
              <p className="text-xs text-surface-light/50">Total Playtime</p>
            </div>
          </div>
        </div>
        <div className="admin-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-light">
                {rows.reduce((s, r) => s + r.games_played, 0)}
              </p>
              <p className="text-xs text-surface-light/50">Total Games Played</p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border bg-dark-hover/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-surface-light/50">Rank</th>
              <th className="px-4 py-3 font-semibold text-surface-light/50">Player</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50">Playtime</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50">Games Played</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-surface-light/50">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-surface-light/20" />
                  No leaderboard data yet. Rankings are generated from gameplay time of authenticated users.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.user_id} className="hover:bg-dark-hover/30">
                  <td className="px-4 py-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      r.rank_value === 1 ? 'bg-gold/15 text-gold' :
                      r.rank_value === 2 ? 'bg-gray-500/15 text-gray-400' :
                      r.rank_value === 3 ? 'bg-amber-500/15 text-amber-500' :
                      'text-surface-light/50'
                    }`}>
                      {r.rank_value}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-hover text-xs font-bold text-aqua">
                          {r.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-surface-light">{r.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-surface-light">{formatPlaytime(r.total_playtime_seconds)}</td>
                  <td className="px-4 py-3 text-right text-surface-light">{r.games_played}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-surface-light/50">
        Rankings are automatically calculated from actual gameplay session durations. Scores cannot be manually submitted.
      </p>
    </div>
  );
}
