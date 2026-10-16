import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { formatDate, getImageFallback } from '@/lib/utils';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
}

export default function NewsCard({ article, featured = false }: NewsCardProps) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className={`group block overflow-hidden rounded-card border border-dark-border bg-dark-card transition-all hover:border-aqua hover:shadow-lg hover:shadow-aqua/10 ${
        featured ? 'sm:flex' : ''
      }`}
    >
      {article.image_url && (
        <div className={`relative overflow-hidden ${featured ? 'sm:w-1/2' : 'aspect-[16/9]'}`}>
          <img
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              featured ? 'aspect-[16/9] sm:h-full' : ''
            }`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getImageFallback(article.title);
            }}
          />
          {article.featured && (
            <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
              FEATURED
            </span>
          )}
        </div>
      )}
      <div className={`p-4 ${featured ? 'sm:flex sm:flex-col sm:justify-center sm:p-6' : ''}`}>
        <h3 className={`font-bold text-surface-light ${featured ? 'text-xl sm:text-2xl' : 'text-base'} line-clamp-2`}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className={`mt-2 text-sm text-surface-light/60 ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>
            {article.excerpt}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-surface-light/40">
          {article.author && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(article.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
