import type { Game } from '@/types';

const STORAGE_KEY = 'playzi_recent_games';
const MAX_RECENT = 5;

export interface RecentGameEntry {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  category_name: string;
  played_at: number;
}

export function getRecentlyPlayed(): RecentGameEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentGameEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function addRecentlyPlayed(game: Game): void {
  try {
    const existing = getRecentlyPlayed();
    const filtered = existing.filter((g) => g.id !== game.id);
    const entry: RecentGameEntry = {
      id: game.id,
      title: game.title,
      slug: game.slug,
      thumbnail: game.thumbnail,
      category_name: game.category_name,
      played_at: Date.now(),
    };
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('playzi:recentGamesUpdated'));
  } catch {
    // localStorage might be unavailable
  }
}
