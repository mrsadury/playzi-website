/*
# PLAYZI: Favorites Table

## Overview
Adds a favorites table so authenticated users can bookmark games as favorites.
Each user can favorite a game only once (unique constraint on user_id + game_id).

## New Tables
### favorites
- id (uuid, primary key)
- user_id (uuid, not null, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
- game_id (uuid, not null, references games ON DELETE CASCADE)
- created_at (timestamptz, defaults to now())

## Constraints
- UNIQUE(user_id, game_id) — one favorite per user per game

## Security
- RLS enabled on favorites
- Owner-scoped CRUD: each authenticated user can only access their own favorites
- user_id defaults to auth.uid() so inserts from the client work without passing user_id
*/

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_game_id ON favorites(game_id);

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites"
  ON favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites"
  ON favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
