/*
# PLAYZI Core Schema - Tables and Functions

Creates all tables, indexes, triggers, and RPC functions for the PLAYZI platform.

## New Tables
- categories: game categories with slug, visibility, sort order
- games: game records with GameMonetize integration, views, featured/published flags
- profiles: user profiles linked to auth.users (auto-created on signup)
- game_views: individual view records for dedup-based view tracking
- import_history: records of GameMonetize feed imports
- site_settings: configurable site-wide settings

## Functions
- is_admin(): checks JWT app_metadata for admin role
- update_updated_at(): trigger function for updated_at columns
- handle_new_user(): auto-creates profile on user signup
- increment_game_view(): dedup-aware view counter
- get_leaderboard(): aggregated leaderboard from game_views
*/

-- ============================================================
-- Helper function: is_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- GAMES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gamemonetize_id text UNIQUE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  game_url text NOT NULL,
  thumbnail text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  category_name text NOT NULL DEFAULT 'Other',
  tags text[],
  width int,
  height int,
  featured boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  views int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- GAME VIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS game_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_views ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- IMPORT HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_url text NOT NULL,
  start_page int NOT NULL DEFAULT 1,
  end_page int NOT NULL DEFAULT 10,
  total_processed int NOT NULL DEFAULT 0,
  new_games int NOT NULL DEFAULT 0,
  updated_games int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SITE SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'PLAYZI',
  tagline text NOT NULL DEFAULT 'Unlimited Cloud Gaming',
  logo_url text,
  default_seo_description text,
  homepage_game_count int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_games_published ON games(published);
CREATE INDEX IF NOT EXISTS idx_games_featured ON games(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_games_category_id ON games(category_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_views ON games(views DESC);
CREATE INDEX IF NOT EXISTS idx_games_category_name ON games(category_name);
CREATE INDEX IF NOT EXISTS idx_game_views_game_id ON game_views(game_id);
CREATE INDEX IF NOT EXISTS idx_game_views_session ON game_views(session_key, game_id);

-- ============================================================
-- TRIGGER: updated_at for games and profiles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RPC: Increment game views (dedup by session)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_game_view(p_game_id uuid, p_session_key text, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM game_views
    WHERE game_id = p_game_id
      AND session_key = p_session_key
      AND created_at > now() - interval '1 hour'
  ) THEN
    INSERT INTO game_views (game_id, session_key, user_id)
    VALUES (p_game_id, p_session_key, p_user_id);

    UPDATE games SET views = views + 1 WHERE id = p_game_id;
  END IF;
END;
$$;

-- ============================================================
-- RPC: Get leaderboard data
-- ============================================================
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_views bigint,
  games_played bigint,
  rank_value bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_stats AS (
    SELECT
      gv.user_id,
      p.username,
      p.avatar_url,
      COUNT(*) AS total_views,
      COUNT(DISTINCT gv.game_id) AS games_played
    FROM game_views gv
    JOIN profiles p ON p.id = gv.user_id
    WHERE gv.user_id IS NOT NULL
    GROUP BY gv.user_id, p.username, p.avatar_url
  ),
  ranked AS (
    SELECT
      user_id,
      username,
      avatar_url,
      total_views,
      games_played,
      ROW_NUMBER() OVER (ORDER BY total_views DESC, games_played DESC) AS rank_value
    FROM user_stats
  )
  SELECT user_id, username, avatar_url, total_views, games_played, rank_value
  FROM ranked
  ORDER BY rank_value
  LIMIT p_limit;
$$;

-- ============================================================
-- Insert default site settings
-- ============================================================
INSERT INTO site_settings (site_name, tagline)
SELECT 'PLAYZI', 'Unlimited Cloud Gaming'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);
