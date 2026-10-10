import type { Game } from '@/types';
import GameCard from './GameCard';

interface GameGridProps {
  games: Game[];
  columns?: 2 | 3 | 4 | 5 | 6;
}

export default function GameGrid({ games, columns = 4 }: GameGridProps) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6',
  }[columns];

  return (
    <div className={`grid ${colClass} gap-3 sm:gap-4`}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
