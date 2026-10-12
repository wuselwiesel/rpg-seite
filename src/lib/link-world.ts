// Welt hinter einem App-Link wie /story/<id>, /posts/<id>, /characters/<id>, /wiki/<id> oder /worlds/<id> (sonst null).
// Gleiche Zuordnung wie die Datenbankfunktion notification_link_world.
import type { SupabaseClient } from "@supabase/supabase-js";

const LINK = /^\/(story|posts|characters|wiki|worlds)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/;

export function parseWorldLink(path: string): { kind: string; id: string } | null {
  const m = LINK.exec(path);
  return m ? { kind: m[1], id: m[2] } : null;
}

export async function worldOfLink(supabase: SupabaseClient, path: string): Promise<string | null> {
  const link = parseWorldLink(path);
  if (!link) return null;
  if (link.kind === "worlds") return link.id;
  if (link.kind === "posts") {
    const { data } = await supabase.from("posts").select("characters!posts_character_id_fkey(world_id)").eq("id", link.id).maybeSingle();
    return (data as { characters: { world_id: string } | null } | null)?.characters?.world_id ?? null;
  }
  const table = link.kind === "story" ? "story_posts" : link.kind === "characters" ? "characters" : "wiki_pages";
  const { data } = await supabase.from(table).select("world_id").eq("id", link.id).maybeSingle();
  return (data as { world_id: string } | null)?.world_id ?? null;
}

// Zieht beim Öffnen eines Links in eine andere Welt die aktive Welt mit (Route /switch-world).
export function worldSwitchHref(worldId: string | null | undefined, link: string): string {
  const query = new URLSearchParams({ next: link });
  if (worldId) query.set("world", worldId);
  return `/switch-world?${query.toString()}`;
}
