/*
# PLAYZI Admin Features Expansion

## Overview
Adds game reports, user management capabilities, maintenance mode, and avatar presets.

## New Tables

### game_reports
- id, game_id (FK), reporter_id (FK nullable), reason, description, status (pending/reviewed/resolved/dismissed), admin_notes, created_at, updated_at

### avatar_presets
- id, url, name, created_at (pre-installed avatars users can pick)

## Modified Tables

### site_settings
- maintenance_enabled (boolean default false)
- maintenance_message (text)
- maintenance_title (text)

### profiles
- is_suspended (boolean default false)
- suspended_reason (text)
- suspended_at (timestamptz)

## Security
- game_reports: anyone can create reports; admin can read/update; users can read own reports
- avatar_presets: public read, admin write
- profiles: admin can update is_suspended fields via existing admin policies (new is_admin check)
- site_settings: existing policies cover new columns
*/

-- ============================================================
-- GAME REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS game_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name text,
  reason text NOT NULL DEFAULT 'other',
  description text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create reports" ON game_reports;
CREATE POLICY "Anyone can create reports"
  ON game_reports FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own reports" ON game_reports;
CREATE POLICY "Users can read own reports"
  ON game_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admin can read all reports" ON game_reports;
CREATE POLICY "Admin can read all reports"
  ON game_reports FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update reports" ON game_reports;
CREATE POLICY "Admin can update reports"
  ON game_reports FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete reports" ON game_reports;
CREATE POLICY "Admin can delete reports"
  ON game_reports FOR DELETE TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_reports_status ON game_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON game_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_game_id ON game_reports(game_id);

-- ============================================================
-- AVATAR PRESETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS avatar_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE avatar_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read avatar presets" ON avatar_presets;
CREATE POLICY "Public can read avatar presets"
  ON avatar_presets FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin insert avatar presets" ON avatar_presets;
CREATE POLICY "Admin insert avatar presets"
  ON avatar_presets FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin delete avatar presets" ON avatar_presets;
CREATE POLICY "Admin delete avatar presets"
  ON avatar_presets FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- ADD COLUMNS TO site_settings
-- ============================================================
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS maintenance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text DEFAULT 'We are performing maintenance. We will be back shortly.',
  ADD COLUMN IF NOT EXISTS maintenance_title text DEFAULT 'Under Maintenance';

-- ============================================================
-- ADD COLUMNS TO profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Admin can update any profile's suspension status
-- (existing "Users can update own profile" policy covers self-updates)
-- Need a new admin policy for suspending others
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_admin());

-- ============================================================
-- RPC: Delete all games (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION delete_all_games()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- game_views will cascade delete due to FK
  DELETE FROM games;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_all_games() TO authenticated;

-- ============================================================
-- RPC: Get analytics data
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS TABLE (
  total_views bigint,
  total_games bigint,
  published_games bigint,
  total_users bigint,
  views_today bigint,
  views_week bigint,
  views_month bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COALESCE(SUM(views), 0) FROM games),
    (SELECT COUNT(*) FROM games),
    (SELECT COUNT(*) FROM games WHERE published = true),
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM game_views WHERE created_at > now() - interval '1 day'),
    (SELECT COUNT(*) FROM game_views WHERE created_at > now() - interval '7 days'),
    (SELECT COUNT(*) FROM game_views WHERE created_at > now() - interval '30 days')
  ;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_summary() TO authenticated;

-- ============================================================
-- Insert default avatar presets
-- ============================================================
INSERT INTO avatar_presets (url, name)
SELECT * FROM (VALUES
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Aqua', 'Aqua Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Cyber', 'Cyber Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Neon', 'Neon Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Gamer', 'Gamer Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Pixel', 'Pixel Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Retro', 'Retro Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Forge', 'Forge Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Volt', 'Volt Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Quantum', 'Quantum Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Blast', 'Blast Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Nova', 'Nova Bot'),
  ('https://api.dicebear.com/7.x/bottts/svg?seed=Echo', 'Echo Bot')
) AS t(url, name)
WHERE NOT EXISTS (SELECT 1 FROM avatar_presets);
