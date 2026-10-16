/*
# PLAYZI: News Articles Table

## Overview
Adds a news table for admin-manageable news articles displayed on the homepage.

## New Tables
### news
- id (uuid, primary key)
- title (text, not null): News headline
- slug (text, unique, not null): URL-friendly identifier
- excerpt (text, nullable): Short summary shown in news cards
- content (text, not null): Full article body
- image_url (text, nullable): Optional cover image
- author (text, nullable): Author name
- published (boolean, default true): Whether the article is visible
- featured (boolean, default false): Whether to highlight in the news section
- sort_order (int, default 0): Display ordering
- created_at (timestamptz): Creation timestamp
- updated_at (timestamptz): Last update timestamp

## Security
- RLS enabled on news table
- Public (anon + authenticated) can read published news
- Only admin users can insert, update, delete news articles
*/

CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  image_url text,
  author text,
  published boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_news_published ON news(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sort_order ON news(sort_order ASC);

DROP TRIGGER IF EXISTS news_updated_at ON news;
CREATE TRIGGER news_updated_at BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "Public can read published news" ON news;
CREATE POLICY "Public can read published news"
  ON news FOR SELECT TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS "Admin can read all news" ON news;
CREATE POLICY "Admin can read all news"
  ON news FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert news" ON news;
CREATE POLICY "Admin can insert news"
  ON news FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update news" ON news;
CREATE POLICY "Admin can update news"
  ON news FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete news" ON news;
CREATE POLICY "Admin can delete news"
  ON news FOR DELETE TO authenticated
  USING (is_admin());
