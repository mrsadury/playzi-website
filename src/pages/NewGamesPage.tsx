import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types';
import GameGrid from '@/components/GameGrid';
import Pagination from '@/components/Pagination';
import { GameGridSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/States';

const PER_PAGE = 24;

export default function NewGamesPage() {
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(total / PER_PAGE);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('games')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    setGames((data as Game[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aqua/15 text-aqua">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">New Games</h1>
          <p className="text-sm text-surface-light/50">Latest games added to PLAYZI</p>
        </div>
      </div>
      {loading ? (
        <GameGridSkeleton count={12} />
      ) : games.length === 0 ? (
        <EmptyState title="No games available" />
      ) : (
        <>
          <GameGrid games={games} columns={5} />
          <Pagination currentPage={page} totalPages={totalPages} basePath="/new" />
        </>
      )}
    </div>
  );
}
