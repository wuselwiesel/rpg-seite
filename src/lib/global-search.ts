import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapePostgrestValue } from "@/lib/postgrest";
import { stripHtml } from "@/lib/strip-html";
import { snippetAround } from "@/lib/search-snippet";

export type CharacterHit = { id: string; name: string; username: string | null; avatar_url: string | null; world: string | null };
export type SceneHit = { id: string; title: string; location: string | null; character: string | null; world: string | null; snippet: string };
export type WikiHit = { id: string; title: string; category: string; world: string | null; snippet: string };
export type PostHit = { id: string; title: string; character: string | null; world: string | null; snippet: string };

type Row = Record<string, unknown>;
const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) ?? null : (v as T | null));

export async function searchCharacters(sb: SupabaseClient, q: string, limit: number): Promise<CharacterHit[]> {
  const term = escapePostgrestValue(q.replace(/^@/, ""));
  const { data } = await sb
    .from("characters")
    .select("id, name, username, avatar_url, worlds(name)")
    .eq("is_npc", false)
    .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
    .order("name")
    .limit(limit);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    username: (r.username as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    world: one<{ name: string }>(r.worlds)?.name ?? null,
  }));
}

// Szenen: Titel, Einleitung und Ort sowie der Text der einzelnen Beiträge innerhalb einer Szene.
export async function searchScenes(sb: SupabaseClient, q: string, limit: number): Promise<SceneHit[]> {
  const term = escapePostgrestValue(q);
  const [{ data: scenes }, { data: entries }] = await Promise.all([
    sb
      .from("story_posts")
      .select("id, title, content, location, characters!story_posts_character_id_fkey(name), worlds(name)")
      .or(`title.ilike.%${term}%,content.ilike.%${term}%,location.ilike.%${term}%`)
      .order("created_at", { ascending: false })
      .limit(limit),
    sb
      .from("story_entries")
      .select("content, story_post_id, story_posts!inner(id, title, location, characters!story_posts_character_id_fkey(name), worlds(name))")
      .ilike("content", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  const hits = new Map<string, SceneHit>();
  for (const r of (scenes ?? []) as Row[]) {
    hits.set(r.id as string, {
      id: r.id as string,
      title: r.title as string,
      location: (r.location as string | null) ?? null,
      character: one<{ name: string }>(r.characters)?.name ?? null,
      world: one<{ name: string }>(r.worlds)?.name ?? null,
      snippet: snippetAround(stripHtml((r.content as string) ?? ""), q),
    });
  }
  for (const r of (entries ?? []) as Row[]) {
    const sp = one<Row>(r.story_posts);
    const id = r.story_post_id as string;
    if (!sp || hits.has(id)) continue;
    hits.set(id, {
      id,
      title: sp.title as string,
      location: (sp.location as string | null) ?? null,
      character: one<{ name: string }>(sp.characters)?.name ?? null,
      world: one<{ name: string }>(sp.worlds)?.name ?? null,
      snippet: snippetAround(stripHtml((r.content as string) ?? ""), q),
    });
  }
  return Array.from(hits.values()).slice(0, limit);
}

export async function searchWiki(sb: SupabaseClient, q: string, limit: number): Promise<WikiHit[]> {
  const term = escapePostgrestValue(q);
  const { data } = await sb
    .from("wiki_pages")
    .select("id, title, content, category, worlds(name)")
    .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
    .order("title")
    .limit(limit);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    category: r.category as string,
    world: one<{ name: string }>(r.worlds)?.name ?? null,
    snippet: snippetAround(stripHtml((r.content as string) ?? ""), q),
  }));
}

export async function searchPosts(sb: SupabaseClient, q: string, limit: number): Promise<PostHit[]> {
  const term = escapePostgrestValue(q.replace(/^#/, ""));
  const { data } = await sb
    .from("posts")
    .select("id, title, content, characters(name, worlds(name))")
    .lte("publish_at", new Date().toISOString())
    .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Row[]).map((r) => {
    const ch = one<Row>(r.characters);
    return {
      id: r.id as string,
      title: (r.title as string) || "Beitrag",
      character: (ch?.name as string | undefined) ?? null,
      world: one<{ name: string }>(ch?.worlds)?.name ?? null,
      snippet: snippetAround(stripHtml((r.content as string) ?? ""), q),
    };
  });
}
