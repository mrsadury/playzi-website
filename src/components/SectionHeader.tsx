import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  linkTo?: string;
  linkLabel?: string;
  children?: ReactNode;
}

export default function SectionHeader({ title, linkTo, linkLabel = 'View all', children }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold text-surface-light sm:text-2xl">{title}</h2>
      <div className="flex items-center gap-3">
        {children}
        {linkTo && (
          <Link
            to={linkTo}
            className="flex items-center gap-1 text-sm font-medium text-aqua transition-colors hover:text-aqua-hover"
          >
            {linkLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
