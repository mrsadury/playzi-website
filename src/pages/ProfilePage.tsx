import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Edit3, Gamepad2, Eye, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDate, formatNumber } from '@/lib/utils';

interface UserStats {
  totalViews: number;
  gamesPlayed: number;
  rank: number | null;
}

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({ totalViews: 0, gamesPlayed: 0, rank: null });

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      (async () => {
        const { data } = await supabase
          .from('game_views')
          .select('id, game_id')
          .eq('user_id', user.id);
        const views = data || [];
        const uniqueGames = new Set(views.map((v) => (v as { game_id: string }).game_id));
        setStats({
          totalViews: views.length,
          gamesPlayed: uniqueGames.size,
          rank: null,
        });
      })();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-aqua border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="card mb-6 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-aqua/20 via-aqua/10 to-surface-secondary" />
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-12">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-24 w-24 rounded-full border-4 border-surface-white object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface-white bg-aqua text-3xl font-bold text-dark-bg">
                    {(profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="pb-2">
                <h1 className="text-2xl font-bold text-surface-light">{profile?.username || 'User'}</h1>
                <p className="text-sm text-surface-light/50">{user.email}</p>
              </div>
            </div>
            <Link to="/profile/edit" className="btn-secondary">
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-aqua/15 text-aqua">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-light">{formatNumber(stats.totalViews)}</p>
              <p className="text-xs text-surface-light/50">Total Views</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-aqua/15 text-aqua">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-light">{stats.gamesPlayed}</p>
              <p className="text-xs text-surface-light/50">Games Played</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-light">
                {stats.rank ? `#${stats.rank}` : '—'}
              </p>
              <p className="text-xs text-surface-light/50">Leaderboard Rank</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <h2 className="mb-4 text-lg font-semibold text-surface-light">Account Information</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-surface-light/50" />
            <span className="text-surface-light/50">Username:</span>
            <span className="font-medium text-surface-light">{profile?.username || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-surface-light/50" />
            <span className="text-surface-light/50">Email:</span>
            <span className="font-medium text-surface-light">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-surface-light/50" />
            <span className="text-surface-light/50">Member since:</span>
            <span className="font-medium text-surface-light">{formatDate(profile?.created_at || user.created_at)}</span>
          </div>
          {profile?.bio && (
            <div className="flex items-start gap-3 text-sm">
              <Edit3 className="h-4 w-4 text-surface-light/50 mt-0.5" />
              <span className="text-surface-light/50">Bio:</span>
              <span className="font-medium text-surface-light">{profile.bio}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
