/*
# PLAYZI: Update increment_game_view to return boolean

## Overview
Modifies increment_game_view RPC to return boolean indicating whether
the view was actually counted (true) or skipped as duplicate (false).
This lets the frontend update the displayed view count only when real.

## Modified Functions
### increment_game_view
- Changed return type from void to boolean
- Returns true when a new view was recorded, false when deduplicated
- Dedup logic unchanged: 1 hour window per session_key per game
*/

DROP FUNCTION IF EXISTS increment_game_view(uuid, text, uuid);

CREATE OR REPLACE FUNCTION increment_game_view(p_game_id uuid, p_session_key text, p_user_id uuid DEFAULT NULL)
RETURNS boolean
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
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_game_view(uuid, text, uuid) TO anon, authenticated;
