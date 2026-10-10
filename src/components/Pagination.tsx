import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
}

export default function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams({ ...searchParams, page: String(page) });
    return `${basePath}?${params.toString()}`;
  };

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {currentPage > 1 && (
        <Link to={buildUrl(currentPage - 1)} className="flex h-9 w-9 items-center justify-center rounded-btn border border-dark-border bg-dark-card text-surface-light/50 hover:border-aqua hover:text-aqua">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-surface-light/50">...</span>
        ) : (
          <Link
            key={p}
            to={buildUrl(p)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-btn px-3 text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-aqua text-dark-bg'
                : 'border border-dark-border bg-dark-card text-surface-light/50 hover:border-aqua hover:text-aqua'
            }`}
          >
            {p}
          </Link>
        )
      )}
      {currentPage < totalPages && (
        <Link to={buildUrl(currentPage + 1)} className="flex h-9 w-9 items-center justify-center rounded-btn border border-dark-border bg-dark-card text-surface-light/50 hover:border-aqua hover:text-aqua">
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
