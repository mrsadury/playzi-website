/*
# PLAYZI: Gameplay Time Tracking, GIF Previews, Custom Branding

## Overview
Adds gameplay time tracking for leaderboard, optional GIF preview URLs for games,
and custom branding logo with positioning controls.

## New Tables

### gameplay_sessions
- id, user_id (FK), game_id (FK), session_key, started_at, ended_at, duration_seconds, is_active
- Tracks individual gameplay sessions with start/end timestamps and accumulated duration

## Modified Tables

### games
- gif_url (text, nullable): Optional animated GIF preview URL

### site_settings
- logo_image_url (text, nullable): Custom landscape logo image
- logo_offset_x (integer, default 0): Horizontal position offset in pixels
- logo_offset_y (integer, default 0): Vertical position offset in pixels
- logo_width (integer, default 160): Logo display width in pixels
- logo_height (integer, default 40): Logo display height in pixels

## Security
- gameplay_sessions: Users manage own sessions; admin can read all
- Existing game/settings policies cover new columns

## Important Notes
1. gameplay_sessions tracks ACTIVE play time only
2. get_leaderboard() replaced to rank by playtime instead of views
3. Anti-cheat: duration capped at 4 hours per session
4. start_gameplay_session and end_gameplay_session RPCs for client
*/

-- ============================================================
-- GAMEPLAY SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS gameplay_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gameplay_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gameplay_sessions_user ON gameplay_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gameplay_sessions_active ON gameplay_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gameplay_sessions_game ON gameplay_sessions(game_id);

DROP POLICY IF EXISTS "Users can insert own gameplay sessions" ON gameplay_sessions;
CREATE POLICY "Users can insert own gameplay sessions"
  ON gameplay_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gameplay sessions" ON gameplay_sessions;
CREATE POLICY "Users can update own gameplay sessions"
  ON gameplay_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own gameplay sessions" ON gameplay_sessions;
CREATE POLICY "Users can read own gameplay sessions"
  ON gameplay_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can read all gameplay sessions" ON gameplay_sessions;
CREATE POLICY "Admin can read all gameplay sessions"
  ON gameplay_sessions FOR SELECT TO authenticated
  USING (is_admin());

-- ============================================================
-- ADD gif_url TO games
-- ============================================================
ALTER TABLE games ADD COLUMN IF NOT EXISTS gif_url text;

-- ============================================================
-- ADD BRANDING COLUMNS TO site_settings
-- ============================================================
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS logo_image_url text,
  ADD COLUMN IF NOT EXISTS logo_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_width integer NOT NULL DEFAULT 160,
  ADD COLUMN IF NOT EXISTS logo_height integer NOT NULL DEFAULT 40;

-- ============================================================
-- RPC: Start gameplay session
-- ============================================================
CREATE OR REPLACE FUNCTION start_gameplay_session(
  p_game_id uuid,
  p_session_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    UPDATE gameplay_sessions
    SET is_active = false,
        ended_at = now(),
        duration_seconds = LEAST(EXTRACT(EPOCH FROM (now() - started_at))::integer, 14400)
    WHERE user_id = current_user_id AND is_active = true;
  END IF;
  
  INSERT INTO gameplay_sessions (user_id, game_id, session_key, is_active)
  VALUES (current_user_id, p_game_id, p_session_key, true)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION start_gameplay_session(uuid, text) TO authenticated;

-- ============================================================
-- RPC: End gameplay session
-- ============================================================
CREATE OR REPLACE FUNCTION end_gameplay_session(
  p_session_id uuid,
  p_session_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started timestamp;
BEGIN
  SELECT started_at INTO started
  FROM gameplay_sessions
  WHERE id = p_session_id AND session_key = p_session_key;
  
  IF NOT FOUND THEN RETURN; END IF;
  
  UPDATE gameplay_sessions
  SET is_active = false,
      ended_at = now(),
      duration_seconds = LEAST(EXTRACT(EPOCH FROM (now() - started))::integer, 14400)
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION end_gameplay_session(uuid, text) TO authenticated;

-- ============================================================
-- Replace get_leaderboard to use playtime
-- ============================================================
DROP FUNCTION IF EXISTS get_leaderboard(integer);

CREATE FUNCTION get_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_playtime_seconds bigint,
  games_played bigint,
  rank_value bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_playtime AS (
    SELECT
      gs.user_id,
      p.username,
      p.avatar_url,
      COALESCE(SUM(gs.duration_seconds), 0) AS total_playtime_seconds,
      COUNT(DISTINCT gs.game_id) AS games_played
    FROM gameplay_sessions gs
    JOIN profiles p ON p.id = gs.user_id
    WHERE gs.user_id IS NOT NULL
      AND gs.is_active = false
    GROUP BY gs.user_id, p.username, p.avatar_url
  ),
  ranked AS (
    SELECT
      user_id,
      username,
      avatar_url,
      total_playtime_seconds,
      games_played,
      ROW_NUMBER() OVER (ORDER BY total_playtime_seconds DESC, games_played DESC) AS rank_value
    FROM user_playtime
  )
  SELECT user_id, username, avatar_url, total_playtime_seconds, games_played, rank_value
  FROM ranked
  ORDER BY rank_value
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard(integer) TO anon, authenticated;

-- ============================================================
-- Ensure delete_all_games has proper grants
-- ============================================================
GRANT EXECUTE ON FUNCTION delete_all_games() TO authenticated;
