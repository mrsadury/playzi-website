import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CustomPage } from '@/types';
import { EmptyState } from '@/components/States';

export default function CustomPageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPage(data as CustomPage);
        if ((data as CustomPage).meta_description) {
          document.title = `${(data as CustomPage).title} - PLAYZI`;
        }
      }
      setLoading(false);
    })();

    return () => {
      document.title = 'PLAYZI - Unlimited Cloud Gaming';
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="shimmer h-8 w-64 rounded-btn" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-5 rounded-btn" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Page not found"
          description="This page may have been removed or is no longer available."
          action={<Link to="/" className="btn-primary">Back to Home</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-surface-light/60 transition-colors hover:text-aqua">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <h1 className="mb-6 text-3xl font-bold text-surface-light">{page.title}</h1>

      <div
        className="custom-page-content prose-content"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
