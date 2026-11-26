import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lastCharacterFor } from "@/lib/last-characters";

// Welcher eigene Charakter soll in einer Welt aktiv sein, wenn man dorthin wechselt?
// 1. der, den man dort zuletzt gewählt hat (Cookie, je Gerät),
// 2. sonst der, mit dem man dort zuletzt geschrieben hat (Szenen-Beiträge oder Feed-Posts) – so klappt es auch auf einem neuen Gerät
//    oder nach gelöschten Cookies,
// 3. sonst null (dann gilt wie bisher der erste Charakter).
export async function resolveLastCharacter(supabase: SupabaseClient, userId: string, worldId: string, rawCookie: string | null | undefined): Promise<string | null> {
  const { data: own } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", userId)
    .eq("world_id", worldId)
    .eq("is_npc", false)
    .eq("vacant", false)
    .is("deleted_at", null)
    .returns<{ id: string }[]>();
  const ids = (own ?? []).map((c) => c.id);
  if (ids.length === 0) return null;

  const remembered = lastCharacterFor(rawCookie, worldId);
  if (remembered && ids.includes(remembered)) return remembered;
  if (ids.length === 1) return ids[0];

  const [entry, post] = await Promise.all([
    supabase.from("story_entries").select("character_id, created_at").in("character_id", ids).order("created_at", { ascending: false }).limit(1).maybeSingle<{ character_id: string; created_at: string }>(),
    supabase.from("posts").select("character_id, created_at").in("character_id", ids).order("created_at", { ascending: false }).limit(1).maybeSingle<{ character_id: string; created_at: string }>(),
  ]);
  const latest = [entry.data, post.data].filter((r): r is { character_id: string; created_at: string } => !!r).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return latest?.character_id ?? null;
}
