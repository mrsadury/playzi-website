/*
# Fix Delete All Games + Add Custom Pages Table

## Changes

### 1. Fix delete_all_games() function
The original `DELETE FROM games` without a WHERE clause was being blocked
by PostgREST/Supabase safety checks. Replaced with `DELETE FROM games WHERE true`
which satisfies the WHERE clause requirement while still deleting all rows.
game_views cascade-delete via FK.

### 2. New table: custom_pages
- `id` (uuid, primary key)
- `title` (text, not null) - page title
- `slug` (text, unique, not null) - URL slug for the page
- `content` (text, not null) - HTML content of the page
- `published` (boolean, default false) - whether the page is live
- `show_in_footer` (boolean, default true) - whether to link in footer
- `meta_description` (text, nullable) - SEO meta description
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 3. Security
- RLS enabled on custom_pages
- Public (anon + authenticated) can read published pages
- Only admins can create/update/delete (via SECURITY DEFINER functions)
- SECURITY DEFINER function `upsert_custom_page` for admin writes
- SECURITY DEFINER function `delete_custom_page` for admin deletes

### 4. Sanitization function
- `sanitize_page_html(p_html text)` strips dangerous tags and attributes:
  - Removes <script>, <iframe>, <object>, <embed>, <link>, <meta>, <style> tags
  - Removes on* event handler attributes
  - Removes javascript: URLs
  - Preserves safe formatting tags (h1-h6, p, a, img, ul, ol, li, table, div, span, etc.)
*/

-- ============================================================
-- Fix: delete_all_games function
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
  
  -- Use WHERE true to satisfy PostgREST safety check
  DELETE FROM games WHERE true;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_all_games() TO authenticated;

-- ============================================================
-- New table: custom_pages
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  show_in_footer boolean NOT NULL DEFAULT true,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
DROP POLICY IF EXISTS "public_read_published_pages" ON custom_pages;
CREATE POLICY "public_read_published_pages"
ON custom_pages FOR SELECT
TO anon, authenticated
USING (published = true);

-- Authenticated can read all pages (for admin listing)
DROP POLICY IF EXISTS "auth_read_all_pages" ON custom_pages;
CREATE POLICY "auth_read_all_pages"
ON custom_pages FOR SELECT
TO authenticated
USING (true);

-- No direct INSERT/UPDATE/DELETE policies - only via SECURITY DEFINER functions

-- ============================================================
-- Sanitization function
-- ============================================================
CREATE OR REPLACE FUNCTION sanitize_page_html(p_html text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result text;
BEGIN
  v_result := p_html;
  
  -- Remove <script>...</script> blocks (including content)
  v_result := regexp_replace(v_result, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove <iframe>...</iframe> blocks
  v_result := regexp_replace(v_result, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  
  -- Remove <object>...</object> blocks
  v_result := regexp_replace(v_result, '<object[^>]*>.*?</object>', '', 'gi');
  
  -- Remove <embed> tags
  v_result := regexp_replace(v_result, '<embed[^>]*/?>', '', 'gi');
  
  -- Remove <style>...</style> blocks
  v_result := regexp_replace(v_result, '<style[^>]*>.*?</style>', '', 'gi');
  
  -- Remove <link> tags
  v_result := regexp_replace(v_result, '<link[^>]*/?>', '', 'gi');
  
  -- Remove <meta> tags
  v_result := regexp_replace(v_result, '<meta[^>]*/?>', '', 'gi');
  
  -- Remove all on* event handler attributes (onclick, onload, onerror, etc.)
  v_result := regexp_replace(v_result, '\son[a-z]+\s*=\s*"[^"]*"', '', 'gi');
  v_result := regexp_replace(v_result, "\son[a-z]+\s*=\s*'[^']*'", '', 'gi');
  v_result := regexp_replace(v_result, '\son[a-z]+\s*=\s*[^\s>]+', '', 'gi');
  
  -- Remove javascript: URLs in href/src attributes
  v_result := regexp_replace(v_result, 'href\s*=\s*"javascript:[^"]*"', 'href="#"', 'gi');
  v_result := regexp_replace(v_result, 'src\s*=\s*"javascript:[^"]*"', 'src="#"', 'gi');
  v_result := regexp_replace(v_result, "href\s*=\s*'javascript:[^']*'", "href='#'", 'gi');
  v_result := regexp_replace(v_result, "src\s*=\s*'javascript:[^']*'", "src='#'", 'gi');
  
  -- Remove data: URLs in src attributes (can be used for attacks)
  v_result := regexp_replace(v_result, 'src\s*=\s*"data:[^"]*"', 'src="#"', 'gi');
  v_result := regexp_replace(v_result, "src\s*=\s*'data:[^']*'", "src='#'", 'gi');
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION sanitize_page_html(text) TO authenticated;

-- ============================================================
-- Admin upsert function for custom pages
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_custom_page(
  p_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_published boolean DEFAULT NULL,
  p_show_in_footer boolean DEFAULT NULL,
  p_meta_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_slug text;
  v_content text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  v_slug := lower(trim(coalesce(p_slug, p_title)));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '^-+|-+$', '');
  
  IF v_slug = '' THEN
    RAISE EXCEPTION 'Slug cannot be empty';
  END IF;
  
  v_content := sanitize_page_html(coalesce(p_content, ''));
  
  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE custom_pages
    SET 
      title = COALESCE(p_title, title),
      slug = COALESCE(v_slug, slug),
      content = COALESCE(v_content, content),
      published = COALESCE(p_published, published),
      show_in_footer = COALESCE(p_show_in_footer, show_in_footer),
      meta_description = COALESCE(p_meta_description, meta_description),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
    
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Page not found';
    END IF;
  ELSE
    -- Create new
    INSERT INTO custom_pages (title, slug, content, published, show_in_footer, meta_description)
    VALUES (p_title, v_slug, v_content, COALESCE(p_published, false), COALESCE(p_show_in_footer, true), p_meta_description)
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_custom_page(
  uuid, text, text, text, boolean, boolean, text
) TO authenticated;

-- ============================================================
-- Admin delete function for custom pages
-- ============================================================
CREATE OR REPLACE FUNCTION delete_custom_page(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  DELETE FROM custom_pages WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_custom_page(uuid) TO authenticated;

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON custom_pages(slug);
CREATE INDEX IF NOT EXISTS idx_custom_pages_published ON custom_pages(published);
