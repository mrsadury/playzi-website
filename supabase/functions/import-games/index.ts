// PLAYZI GameMonetize Feed Importer
// Fetches game metadata from GameMonetize JSON feeds and upserts into the database.
// SSRF-safe: only allows trusted GameMonetize hosts.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_HOSTS = [
  "gamemonetize.com",
  "www.gamemonetize.com",
];

interface GameMonetizeItem {
  id?: string;
  ID?: string;
  title?: string;
  name?: string;
  description?: string;
  desc?: string;
  url?: string;
  game_url?: string;
  link?: string;
  thumb?: string;
  thumbnail?: string;
  image?: string;
  category?: string;
  categories?: string;
  tags?: string;
  tag?: string;
  width?: string | number;
  height?: string | number;
  type?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

function normalizeCategory(cat: string | undefined): string {
  if (!cat || cat.trim() === "") return "Other";
  const lower = cat.trim().toLowerCase();
  const map: Record<string, string> = {
    "action": "Action",
    "adventure": "Adventure",
    "arcade": "Arcade",
    "puzzle": "Puzzle",
    "sports": "Sports",
    "racing": "Racing",
    "shooting": "Shooting",
    "strategy": "Strategy",
    "girls": "Girls",
    "multiplayer": "Multiplayer",
    ".io": ".io",
    "io": ".io",
    "hypercasual": "Hypercasual",
    "clicker": "Hypercasual",
    "idle": "Hypercasual",
    "casual": "Hypercasual",
    "other": "Other",
  };
  return map[lower] || cat.trim().charAt(0).toUpperCase() + cat.trim().slice(1).toLowerCase();
}

function parseTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string" && t.trim());
  if (typeof tags === "string") {
    return tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function parseGameItem(item: GameMonetizeItem): {
  gamemonetize_id: string;
  title: string;
  slug: string;
  description: string;
  game_url: string;
  thumbnail: string | null;
  category_name: string;
  tags: string[];
  width: number | null;
  height: number | null;
} | null {
  const gmId = String(item.id || item.ID || "").trim();
  const title = String(item.title || item.name || "").trim();
  const gameUrl = String(item.game_url || item.url || item.link || "").trim();

  if (!gmId || !title || !gameUrl) return null;

  const slug = slugify(title) || `game-${gmId}`;
  const description = String(item.description || item.desc || "").trim();
  const thumbnail = String(item.thumbnail || item.thumb || item.image || "").trim() || null;
  const category = normalizeCategory(String(item.category || item.categories || "Other"));
  const tags = parseTags(item.tags || item.tag);
  const width = item.width ? parseInt(String(item.width), 10) || null : null;
  const height = item.height ? parseInt(String(item.height), 10) || null : null;

  return { gamemonetize_id: gmId, title, slug, description, game_url: gameUrl, thumbnail, category_name: category, tags, width, height };
}

async function fetchFeedPage(feedUrl: string, page: number): Promise<GameMonetizeItem[]> {
  let url = feedUrl;
  url = url.replace(/&page=\d+/, "");
  url = url.replace(/page=\d+/, "");
  url += (url.includes("?") ? "&" : "?") + `page=${page}`;

  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Blocked: host "${parsed.hostname}" is not in the allowlist`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "PLAYZI-Importer/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Feed returned HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.games)) return data.games;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.feed)) return data.feed;
    throw new Error("Unexpected JSON structure: no game array found");
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { feed_url, start_page, end_page, admin_token } = await req.json();

    if (!feed_url || typeof feed_url !== "string") {
      return new Response(JSON.stringify({ error: "feed_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startPage = Math.max(1, parseInt(String(start_page || "1"), 10));
    const endPage = Math.min(50, Math.max(1, parseInt(String(end_page || "10"), 10)));

    if (startPage > endPage) {
      return new Response(JSON.stringify({ error: "start_page must be <= end_page" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin access
    if (admin_token) {
      const { data: userData } = await supabase.auth.getUser(admin_token);
      if (!userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const role = userData.user.app_metadata?.role;
      if (role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Admin token required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create import history record
    const { data: importRecord } = await supabase
      .from("import_history")
      .insert({
        feed_url,
        start_page: startPage,
        end_page: endPage,
        status: "running",
      })
      .select()
      .single();

    const importId = importRecord?.id;

    let totalProcessed = 0;
    let newGames = 0;
    let updatedGames = 0;
    let failed = 0;
    const categorySet = new Set<string>();

    for (let page = startPage; page <= endPage; page++) {
      try {
        const items = await fetchFeedPage(feed_url, page);

        for (const item of items) {
          totalProcessed++;
          const parsed = parseGameItem(item);

          if (!parsed) {
            failed++;
            continue;
          }

          categorySet.add(parsed.category_name);

          // Find or create category
          let categoryId: string | null = null;
          const { data: existingCat } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", slugify(parsed.category_name))
            .maybeSingle();

          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const { data: newCat } = await supabase
              .from("categories")
              .insert({
                name: parsed.category_name,
                slug: slugify(parsed.category_name),
                visible: true,
                sort_order: 0,
              })
              .select("id")
              .maybeSingle();
            if (newCat) categoryId = newCat.id;
          }

          // Check if game exists by gamemonetize_id
          const { data: existingGame } = await supabase
            .from("games")
            .select("id, featured, published")
            .eq("gamemonetize_id", parsed.gamemonetize_id)
            .maybeSingle();

          if (existingGame) {
            // Update but preserve featured/published
            const { error: updateErr } = await supabase
              .from("games")
              .update({
                title: parsed.title,
                description: parsed.description,
                game_url: parsed.game_url,
                thumbnail: parsed.thumbnail,
                category_id: categoryId,
                category_name: parsed.category_name,
                tags: parsed.tags,
                width: parsed.width,
                height: parsed.height,
              })
              .eq("id", existingGame.id);

            if (updateErr) {
              failed++;
            } else {
              updatedGames++;
            }
          } else {
            // Insert new game
            const { error: insertErr } = await supabase
              .from("games")
              .insert({
                gamemonetize_id: parsed.gamemonetize_id,
                title: parsed.title,
                slug: parsed.slug,
                description: parsed.description,
                game_url: parsed.game_url,
                thumbnail: parsed.thumbnail,
                category_id: categoryId,
                category_name: parsed.category_name,
                tags: parsed.tags,
                width: parsed.width,
                height: parsed.height,
                featured: false,
                published: true,
                views: 0,
              });

            if (insertErr) {
              failed++;
            } else {
              newGames++;
            }
          }
        }
      } catch (pageErr) {
        console.error(`Error fetching page ${page}:`, pageErr);
        // Continue to next page
      }
    }

    // Update import history
    if (importId) {
      await supabase
        .from("import_history")
        .update({
          total_processed: totalProcessed,
          new_games: newGames,
          updated_games: updatedGames,
          failed: failed,
          status: "completed",
        })
        .eq("id", importId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_processed: totalProcessed,
        new_games: newGames,
        updated_games: updatedGames,
        failed: failed,
        categories_found: Array.from(categorySet),
        import_id: importId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
