import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, Clock, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/States';

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
  const remHrs = hours % 24;
  return `${days}d ${remHrs}h`;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 50 });
      if (!error && data) {
        setRows(data as LeaderboardRow[]);
      }
      setLoading(false);
    })();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-gold" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-surface-light/50">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">Leaderboard</h1>
            <p className="text-sm text-surface-light/50">Top players on PLAYZI</p>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">Leaderboard</h1>
            <p className="text-sm text-surface-light/50">Top players on PLAYZI</p>
          </div>
        </div>
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title="No rankings yet"
          description="Play games and your gameplay time will appear on the leaderboard. Sign in to start tracking your progress."
          action={
            user ? (
              <Link to="/games" className="btn-primary">Browse Games</Link>
            ) : (
              <Link to="/signup" className="btn-primary">Create Account</Link>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">Leaderboard</h1>
          <p className="text-sm text-surface-light/50">Top {rows.length} players ranked by gameplay time</p>
        </div>
      </div>

      {/* Top 3 podium */}
      {rows.length >= 3 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const r = rows[idx];
            if (!r) return null;
            const isFirst = idx === 0;
            return (
              <div
                key={r.user_id}
                className={`card flex flex-col items-center p-4 text-center ${
                  isFirst ? 'order-2 -mt-2 border-gold/40 shadow-lg shadow-gold/10' : idx === 1 ? 'order-1' : 'order-3'
                }`}
              >
                <div className="mb-2">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className={`rounded-full object-cover ${isFirst ? 'h-16 w-16' : 'h-12 w-12'}`} />
                  ) : (
                    <div className={`flex items-center justify-center rounded-full bg-aqua text-black font-bold ${isFirst ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base'}`}>
                      {r.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="truncate text-sm font-semibold text-surface-light">{r.username}</p>
                <p className="flex items-center gap-1 text-xs text-surface-light/50">
                  <Clock className="h-3 w-3" />
                  {formatPlaytime(r.total_playtime_seconds)}
                </p>
                <div className="mt-2">{getRankIcon(r.rank_value)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border bg-dark-hover/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-surface-light/50">Rank</th>
              <th className="px-4 py-3 font-semibold text-surface-light/50">Player</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50">Playtime</th>
              <th className="hidden px-4 py-3 text-right font-semibold text-surface-light/50 sm:table-cell">Games Played</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.user_id}
                className={`border-b border-dark-border/50 transition-colors hover:bg-dark-hover/30 ${
                  user?.id === r.user_id ? 'bg-aqua/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center">
                    {getRankIcon(r.rank_value)}
                  </div>
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
                    <span className="font-medium text-surface-light">
                      {r.username}
                      {user?.id === r.user_id && <span className="ml-1 text-xs text-aqua">(You)</span>}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-1 text-surface-light/70">
                    <Clock className="h-3.5 w-3.5" />
                    {formatPlaytime(r.total_playtime_seconds)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-right sm:table-cell">
                  <span className="flex items-center justify-end gap-1 text-surface-light/70">
                    <Gamepad2 className="h-3.5 w-3.5" />
                    {r.games_played}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
