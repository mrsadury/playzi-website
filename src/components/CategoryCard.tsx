import { Link } from 'react-router-dom';
import { Gamepad2, ChevronRight } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  gameCount?: number;
}

export default function CategoryCard({ category, gameCount }: CategoryCardProps) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group flex items-center justify-between rounded-card border border-dark-border bg-dark-card p-4 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-aqua/40 hover:shadow-card-hover"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-dark-hover text-aqua transition-all duration-300 ease-smooth group-hover:bg-gradient-to-br group-hover:from-aqua group-hover:to-aqua-strong group-hover:text-dark-bg group-hover:shadow-glow-sm">
          <Gamepad2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-surface-light transition-colors duration-300 group-hover:text-aqua">{category.name}</h3>
          <p className="text-xs text-surface-light/50">
            {gameCount !== undefined ? `${gameCount} games` : 'Browse games'}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-surface-light/40 transition-all duration-300 ease-smooth group-hover:translate-x-1 group-hover:text-aqua" />
    </Link>
  );
}
