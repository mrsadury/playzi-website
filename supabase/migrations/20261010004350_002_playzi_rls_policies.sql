/*
# PLAYZI RLS Policies

Sets row-level security policies for all PLAYZI tables.

## Security Model
- Public (anon) can READ published games, visible categories, profiles, site settings
- Authenticated users can manage their own profile and view their own game views
- Admin users (checked via is_admin() JWT function) get full CRUD on games, categories, import_history, site_settings
- Anyone can insert game_views (for view tracking), users can read their own, admins can read all
*/

-- ============================================================
-- CATEGORIES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Public can read visible categories" ON categories;
CREATE POLICY "Public can read visible categories"
  ON categories FOR SELECT TO anon, authenticated
  USING (visible = true);

DROP POLICY IF EXISTS "Admin can read all categories" ON categories;
CREATE POLICY "Admin can read all categories"
  ON categories FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin insert categories" ON categories;
CREATE POLICY "Admin insert categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin update categories" ON categories;
CREATE POLICY "Admin update categories"
  ON categories FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin delete categories" ON categories;
CREATE POLICY "Admin delete categories"
  ON categories FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- GAMES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Public can read published games" ON games;
CREATE POLICY "Public can read published games"
  ON games FOR SELECT TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS "Admin can read all games" ON games;
CREATE POLICY "Admin can read all games"
  ON games FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin insert games" ON games;
CREATE POLICY "Admin insert games"
  ON games FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin update games" ON games;
CREATE POLICY "Admin update games"
  ON games FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin delete games" ON games;
CREATE POLICY "Admin delete games"
  ON games FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Public can read profiles" ON profiles;
CREATE POLICY "Public can read profiles"
  ON profiles FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- GAME VIEWS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert game views" ON game_views;
CREATE POLICY "Anyone can insert game views"
  ON game_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own views" ON game_views;
CREATE POLICY "Users can read own views"
  ON game_views FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can read all views" ON game_views;
CREATE POLICY "Admin can read all views"
  ON game_views FOR SELECT TO authenticated
  USING (is_admin());

-- ============================================================
-- IMPORT HISTORY POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Admin can read import history" ON import_history;
CREATE POLICY "Admin can read import history"
  ON import_history FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert import history" ON import_history;
CREATE POLICY "Admin can insert import history"
  ON import_history FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update import history" ON import_history;
CREATE POLICY "Admin can update import history"
  ON import_history FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- SITE SETTINGS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings"
  ON site_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can insert site settings" ON site_settings;
CREATE POLICY "Admin can insert site settings"
  ON site_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update site settings" ON site_settings;
CREATE POLICY "Admin can update site settings"
  ON site_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- Grant execute on RPC functions
-- ============================================================
GRANT EXECUTE ON FUNCTION increment_game_view(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
