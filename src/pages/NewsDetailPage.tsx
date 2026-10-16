import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Calendar, User, ArrowLeft, Gamepad2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { NewsArticle } from '@/types';
import { formatDate, getImageFallback } from '@/lib/utils';
import { EmptyState } from '@/components/States';

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setArticle(data as NewsArticle);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="shimmer h-64 rounded-card" />
        <div className="mt-4 space-y-3">
          <div className="shimmer h-6 w-3/4 rounded" />
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-full rounded" />
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title="Article not found"
          description="This news article may have been removed or is no longer available."
          action={<Link to="/" className="btn-primary">Back to Home</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-4 flex items-center gap-1 text-sm text-surface-light/60">
        <Link to="/" className="hover:text-aqua">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-surface-light">News</span>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-surface-light">{article.title}</span>
      </nav>

      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-aqua hover:text-aqua-hover">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <article>
        <h1 className="text-3xl font-bold text-surface-light sm:text-4xl">{article.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-surface-light/50">
          {article.author && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {article.author}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.created_at)}
          </span>
        </div>

        {article.image_url && (
          <div className="mt-6 overflow-hidden rounded-card">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getImageFallback(article.title);
              }}
            />
          </div>
        )}

        {article.excerpt && (
          <p className="mt-6 text-lg font-medium text-surface-light/80">{article.excerpt}</p>
        )}

        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-surface-light/70 sm:text-base">
          {article.content}
        </div>
      </article>
    </div>
  );
}
