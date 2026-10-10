import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronRight, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game, Category } from '@/types';
import GameGrid from '@/components/GameGrid';
import Pagination from '@/components/Pagination';
import { GameGridSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/States';

const PER_PAGE = 24;
type SortOption = 'popular' | 'newest' | 'alpha';

const SORT_MAP: Record<SortOption, { column: string; ascending: boolean }> = {
  popular: { column: 'views', ascending: false },
  newest: { column: 'created_at', ascending: false },
  alpha: { column: 'title', ascending: true },
};

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: cat } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!cat) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory(cat as Category);

      const sortConfig = SORT_MAP[sort] || SORT_MAP.popular;
      const { data, count } = await supabase
        .from('games')
        .select('*', { count: 'exact' })
        .eq('published', true)
        .eq('category_id', (cat as Category).id)
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

      setGames((data as Game[]) || []);
      setTotal(count || 0);
      setLoading(false);
    })();
  }, [slug, sort, page]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title="Category not found"
          description="This category doesn't exist or has been removed."
          action={<Link to="/categories" className="btn-primary">Browse Categories</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-surface-light/50">
        <Link to="/" className="hover:text-aqua">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/categories" className="hover:text-aqua">Categories</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-surface-light">{category?.name || '...'}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">{category?.name || 'Loading...'}</h1>
          {category?.description && <p className="mt-1 text-sm text-surface-light/50">{category.description}</p>}
          <p className="mt-1 text-xs text-surface-light/50">{total} game{total !== 1 ? 's' : ''}</p>
        </div>
        <select
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="input-field cursor-pointer sm:w-48"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>

      {/* Games */}
      {loading ? (
        <GameGridSkeleton count={12} />
      ) : games.length === 0 ? (
        <EmptyState title="No games in this category" description="Check back later for new additions." />
      ) : (
        <>
          <GameGrid games={games} columns={5} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath={`/category/${slug}`}
            searchParams={{ sort }}
          />
        </>
      )}
    </div>
  );
}
