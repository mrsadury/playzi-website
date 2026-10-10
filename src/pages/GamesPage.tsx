import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game, Category } from '@/types';
import GameGrid from '@/components/GameGrid';
import Pagination from '@/components/Pagination';
import { GameGridSkeleton } from '@/components/Skeletons';
import { EmptyState, SearchResultEmpty } from '@/components/States';

const PER_PAGE = 24;
type SortOption = 'popular' | 'newest' | 'recent' | 'alpha';

const SORT_MAP: Record<SortOption, { column: string; ascending: boolean }> = {
  popular: { column: 'views', ascending: false },
  newest: { column: 'created_at', ascending: false },
  recent: { column: 'updated_at', ascending: false },
  alpha: { column: 'title', ascending: true },
};

export default function GamesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';
  const sort = (searchParams.get('sort') as SortOption) || 'popular';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const totalPages = Math.ceil(total / PER_PAGE);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const fetchGames = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('games').select('*', { count: 'exact' }).eq('published', true);

    if (q) {
      query = query.or(`title.ilike.%${q}%,category_name.ilike.%${q}%,tags.cs.{${q}}`);
    }
    if (categorySlug) {
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
      if (cat) query = query.eq('category_id', cat.id);
    }

    const sortConfig = SORT_MAP[sort] || SORT_MAP.popular;
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });
    query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    const { data, count } = await query;
    setGames((data as Game[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [q, categorySlug, sort, page]);

  useEffect(() => {
    supabase.from('categories').select('*').eq('visible', true).order('name').then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">All Games</h1>
        <p className="mt-1 text-sm text-surface-light/50">
          {total > 0 ? `${total} game${total !== 1 ? 's' : ''} available` : 'Browse our game library'}
        </p>
      </div>

      {/* Filters bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/50/50" />
          <input
            type="text"
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search by title, category, or tag..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categorySlug}
            onChange={(e) => updateParam('category', e.target.value)}
            className="input-field cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="input-field cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="recent">Recently Updated</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <GameGridSkeleton count={12} />
      ) : games.length === 0 ? (
        q ? (
          <SearchResultEmpty query={q} />
        ) : (
          <EmptyState title="No games found" description="Try adjusting your filters or check back later." />
        )
      ) : (
        <>
          <GameGrid games={games} columns={5} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/games"
            searchParams={{ q, category: categorySlug, sort }}
          />
        </>
      )}
    </div>
  );
}
