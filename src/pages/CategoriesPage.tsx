import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';
import CategoryCard from '@/components/CategoryCard';
import { EmptyState } from '@/components/States';
import { Gamepad2 } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: catData }, { data: gameData }] = await Promise.all([
        supabase.from('categories').select('*').eq('visible', true).order('sort_order'),
        supabase.from('games').select('category_id').eq('published', true).not('category_id', 'is', null),
      ]);

      setCategories((catData as Category[]) || []);
      const c: Record<string, number> = {};
      (gameData || []).forEach((row) => {
        const cid = (row as { category_id: string }).category_id;
        c[cid] = (c[cid] || 0) + 1;
      });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-surface-light sm:text-3xl">Categories</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title="No categories yet"
          description="Categories will appear here once games are imported."
          action={<Link to="/games" className="btn-primary">Browse Games</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-light sm:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-surface-light/50">{categories.length} categories available</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} gameCount={counts[cat.id] || 0} />
        ))}
      </div>
    </div>
  );
}
