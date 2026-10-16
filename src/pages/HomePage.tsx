import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Sparkles, Clock, Gamepad2, ChevronRight, Newspaper } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game, Category, NewsArticle } from '@/types';
import FeaturedSlider from '@/components/FeaturedSlider';
import GameGrid from '@/components/GameGrid';
import SectionHeader from '@/components/SectionHeader';
import CategoryCard from '@/components/CategoryCard';
import NewsCard from '@/components/NewsCard';
import { HeroSkeleton, GameGridSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/States';

export default function HomePage() {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [popularGames, setPopularGames] = useState<Game[]>([]);
  const [newGames, setNewGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [featuredRes, popularRes, newRes, recentRes, catRes, newsRes] = await Promise.all([
        supabase.from('games').select('*').eq('published', true).eq('featured', true).order('views', { ascending: false }).limit(5),
        supabase.from('games').select('*').eq('published', true).order('views', { ascending: false }).limit(12),
        supabase.from('games').select('*').eq('published', true).order('created_at', { ascending: false }).limit(12),
        supabase.from('games').select('*').eq('published', true).order('created_at', { ascending: false }).limit(8),
        supabase.from('categories').select('*').eq('visible', true).order('sort_order', { ascending: true }).limit(12),
        supabase.from('news').select('*').eq('published', true).order('created_at', { ascending: false }).limit(4),
      ]);

      let featured = featuredRes.data as Game[] || [];
      if (featured.length === 0 && popularRes.data) {
        featured = (popularRes.data as Game[]).slice(0, 3);
      }

      setFeaturedGames(featured);
      setPopularGames((popularRes.data as Game[]) || []);
      setNewGames((newRes.data as Game[]) || []);
      setRecentGames((recentRes.data as Game[]) || []);
      const cats = (catRes.data as Category[]) || [];
      setCategories(cats);
      setNewsArticles((newsRes.data as NewsArticle[]) || []);

      // Get game counts per category
      if (cats.length > 0) {
        const counts: Record<string, number> = {};
        const { data: countData } = await supabase
          .from('games')
          .select('category_id')
          .eq('published', true)
          .not('category_id', 'is', null);

        if (countData) {
          countData.forEach((row) => {
            const cid = (row as { category_id: string }).category_id;
            counts[cid] = (counts[cid] || 0) + 1;
          });
        }
        setCategoryCounts(counts);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <HeroSkeleton />
        <div className="mt-8">
          <GameGridSkeleton count={8} />
        </div>
      </div>
    );
  }

  if (featuredGames.length === 0 && popularGames.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title="No games available yet"
          description="Games will appear here once they are imported by an administrator."
        />
      </div>
    );
  }

  const featuredNews = newsArticles.find((a) => a.featured) || null;
  const otherNews = featuredNews ? newsArticles.filter((a) => a.id !== featuredNews.id) : newsArticles;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero Slider */}
      {featuredGames.length > 0 && (
        <div className="mb-8">
          <FeaturedSlider games={featuredGames} />
        </div>
      )}

      {/* Popular Games */}
      {popularGames.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Popular Games"
            linkTo="/popular"
            linkLabel="View all"
          >
            <span className="hidden items-center gap-1 text-sm text-surface-light/50 sm:flex">
              <TrendingUp className="h-4 w-4 text-aqua" />
              Most played
            </span>
          </SectionHeader>
          <GameGrid games={popularGames.slice(0, 10)} columns={5} />
        </section>
      )}

      {/* New Games */}
      {newGames.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="New Games"
            linkTo="/new"
            linkLabel="View all"
          >
            <span className="hidden items-center gap-1 text-sm text-surface-light/50 sm:flex">
              <Sparkles className="h-4 w-4 text-aqua" />
              Fresh additions
            </span>
          </SectionHeader>
          <GameGrid games={newGames.slice(0, 10)} columns={5} />
        </section>
      )}

      {/* News Section */}
      {newsArticles.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Latest News">
            <span className="hidden items-center gap-1 text-sm text-surface-light/50 sm:flex">
              <Newspaper className="h-4 w-4 text-aqua" />
              Updates
            </span>
          </SectionHeader>
          {featuredNews && (
            <div className="mb-4">
              <NewsCard article={featuredNews} featured />
            </div>
          )}
          {otherNews.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherNews.slice(0, 3).map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Explore Categories" linkTo="/categories" linkLabel="View all" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} gameCount={categoryCounts[cat.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recentGames.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Recently Added"
            linkTo="/games?sort=newest"
            linkLabel="View all"
          >
            <span className="hidden items-center gap-1 text-sm text-surface-light/50 sm:flex">
              <Clock className="h-4 w-4 text-aqua" />
              Latest entries
            </span>
          </SectionHeader>
          <GameGrid games={recentGames} columns={5} />
        </section>
      )}

      {/* CTA */}
      <section className="mb-4 overflow-hidden rounded-card border border-dark-border bg-dark-surface p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold text-surface-light sm:text-3xl">Ready to play?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-surface-light/60">
          Explore hundreds of browser games across every category. No downloads required.
        </p>
        <Link to="/games" className="btn-primary mt-6">
          Browse All Games
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
