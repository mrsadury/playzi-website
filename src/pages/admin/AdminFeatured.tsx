import { useEffect, useState, useCallback } from 'react';
import { Star, Search, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types';
import { useToast } from '@/context/ToastContext';
import { formatNumber, getImageFallback } from '@/lib/utils';

export default function AdminFeatured() {
  const { showToast } = useToast();
  const [featured, setFeatured] = useState<Game[]>([]);
  const [available, setAvailable] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [featRes, availRes] = await Promise.all([
      supabase.from('games').select('*').eq('featured', true).order('views', { ascending: false }),
      supabase.from('games').select('*').eq('featured', false).eq('published', true).order('views', { ascending: false }).limit(50),
    ]);
    setFeatured((featRes.data as Game[]) || []);
    setAvailable((availRes.data as Game[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFeatured = async (game: Game) => {
    const { error } = await supabase.from('games').update({ featured: !game.featured }).eq('id', game.id);
    if (error) {
      showToast('Failed to update', 'error');
    } else {
      showToast(game.featured ? 'Removed from featured' : 'Added to featured', 'success');
      fetchData();
    }
  };

  const filteredAvailable = available.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-light">Featured Games</h1>
        <p className="text-sm text-surface-light/50">Manage games displayed on the homepage</p>
      </div>

      {/* Currently featured */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-surface-light">Currently Featured ({featured.length})</h2>
        {loading ? (
          <div className="shimmer h-32 rounded-card" />
        ) : featured.length === 0 ? (
          <div className="admin-card p-8 text-center text-sm text-surface-light/50">
            No featured games yet. Add games from the list below.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((game) => (
              <div key={game.id} className="admin-card flex items-center gap-3 p-3">
                <img
                  src={game.thumbnail || getImageFallback(game.title)}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = getImageFallback(game.title); }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-light">{game.title}</p>
                  <p className="flex items-center gap-1 text-xs text-surface-light/50">
                    <Eye className="h-3 w-3" />{formatNumber(game.views)} views
                  </p>
                </div>
                <button
                  onClick={() => toggleFeatured(game)}
                  className="rounded-btn bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/25"
                >
                  Unfeature
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available to feature */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-surface-light">Available Games</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/50/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-field w-48 pl-9"
            />
          </div>
        </div>
        {loading ? (
          <div className="shimmer h-32 rounded-card" />
        ) : filteredAvailable.length === 0 ? (
          <div className="admin-card p-8 text-center text-sm text-surface-light/50">
            No available games to feature.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAvailable.slice(0, 24).map((game) => (
              <div key={game.id} className="admin-card flex items-center gap-3 p-3">
                <img
                  src={game.thumbnail || getImageFallback(game.title)}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = getImageFallback(game.title); }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-light">{game.title}</p>
                  <p className="flex items-center gap-1 text-xs text-surface-light/50">
                    <Eye className="h-3 w-3" />{formatNumber(game.views)} views
                  </p>
                </div>
                <button
                  onClick={() => toggleFeatured(game)}
                  className="rounded-btn bg-aqua/15 px-3 py-1.5 text-xs font-medium text-aqua hover:bg-aqua/25"
                >
                  <Star className="h-3 w-3 inline" /> Feature
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
