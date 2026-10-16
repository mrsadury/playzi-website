import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Gamepad2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Game } from '@/types';
import GameGrid from '@/components/GameGrid';
import { GameGridSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/States';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('game_id')
        .eq('user_id', user?.id);

      if (error || !data || data.length === 0) {
        setGames([]);
        setLoading(false);
        return;
      }

      const gameIds = data.map((f) => (f as { game_id: string }).game_id);
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .in('id', gameIds)
        .eq('published', true)
        .order('title', { ascending: true });

      setGames((gameData as Game[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const filtered = games.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
        <h1 className="text-2xl font-bold text-surface-light">Favorite Games</h1>
        {games.length > 0 && (
          <span className="rounded-full bg-pink-500/15 px-2.5 py-0.5 text-sm font-medium text-pink-400">
            {games.length}
          </span>
        )}
      </div>

      {games.length > 0 && (
        <div className="mb-6 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search favorites..."
            className="w-full rounded-btn border border-dark-border bg-dark-card py-2.5 pl-9 pr-4 text-sm text-surface-light placeholder:text-surface-light/40 focus:border-aqua focus:outline-none focus:ring-1 focus:ring-aqua/30"
          />
        </div>
      )}

      {loading ? (
        <GameGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title={games.length === 0 ? "No favorites yet" : "No matches found"}
          description={
            games.length === 0
              ? "Tap the heart icon on any game page to add it to your favorites."
              : "Try a different search term."
          }
          action={
            games.length === 0 ? (
              <Link to="/games" className="btn-primary">Browse Games</Link>
            ) : undefined
          }
        />
      ) : (
        <GameGrid games={filtered} columns={5} />
      )}
    </div>
  );
}
