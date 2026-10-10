import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types';
import GameGrid from '@/components/GameGrid';
import Pagination from '@/components/Pagination';
import { GameGridSkeleton } from '@/components/Skeletons';
import { SearchResultEmpty, EmptyState } from '@/components/States';

const PER_PAGE = 24;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(total / PER_PAGE);

  const updatePage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  };

  const fetchGames = useCallback(async () => {
    setLoading(true);
    if (!q) {
      setGames([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const { data, count } = await supabase
      .from('games')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .or(`title.ilike.%${q}%,category_name.ilike.%${q}%,tags.cs.{${q}}`)
      .order('views', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    setGames((data as Game[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [q, page]);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set('q', query.trim());
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-surface-light sm:text-3xl">Search Games</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/50/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, category, or tag..."
            className="input-field pl-9"
            autoFocus
          />
        </div>
      </form>

      {q && !loading && (
        <p className="mb-4 text-sm text-surface-light/50">
          {total > 0
            ? `${total} result${total !== 1 ? 's' : ''} for "${q}"`
            : `No results for "${q}"`}
        </p>
      )}

      {loading ? (
        <GameGridSkeleton count={12} />
      ) : !q ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Search for games"
          description="Type a game title, category name, or tag to find games."
        />
      ) : games.length === 0 ? (
        <SearchResultEmpty query={q} />
      ) : (
        <>
          <GameGrid games={games} columns={5} />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              basePath="/search"
              searchParams={{ q }}
            />
          )}
        </>
      )}
    </div>
  );
}
