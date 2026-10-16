export interface Game {
  id: string;
  gamemonetize_id: string;
  title: string;
  slug: string;
  description: string | null;
  game_url: string;
  thumbnail: string | null;
  gif_url: string | null;
  category_id: string | null;
  category_name: string;
  tags: string[] | null;
  width: number | null;
  height: number | null;
  featured: boolean;
  published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visible: boolean;
  sort_order: number;
  game_count?: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameView {
  id: string;
  game_id: string;
  user_id: string | null;
  session_key: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_playtime_seconds: number;
  games_played: number;
  rank_value: number;
}

export interface ImportHistory {
  id: string;
  feed_url: string;
  start_page: number;
  end_page: number;
  total_processed: number;
  new_games: number;
  updated_games: number;
  failed: number;
  status: string;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  logo_image_url: string | null;
  logo_offset_x: number;
  logo_offset_y: number;
  logo_width: number;
  logo_height: number;
  favicon_url: string | null;
  default_seo_description: string | null;
  meta_keywords: string | null;
  og_image_url: string | null;
  twitter_card_type: string;
  primary_color: string;
  footer_text: string | null;
  homepage_game_count: number;
  popup_enabled: boolean;
  popup_title: string | null;
  popup_message: string | null;
  popup_button_text: string | null;
  popup_button_url: string | null;
  popup_image_url: string | null;
  popup_dismissible: boolean;
  popup_start_date: string | null;
  popup_end_date: string | null;
  maintenance_enabled: boolean;
  maintenance_message: string | null;
  maintenance_title: string | null;
}

export interface GameWithCategory extends Game {
  categories?: Category;
}

export interface GameReport {
  id: string;
  game_id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  games?: Game;
}

export interface AvatarPreset {
  id: string;
  url: string;
  name: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_views: number;
  total_games: number;
  published_games: number;
  total_users: number;
  views_today: number;
  views_week: number;
  views_month: number;
}

export interface AdminUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  show_in_footer: boolean;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  author: string | null;
  published: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
