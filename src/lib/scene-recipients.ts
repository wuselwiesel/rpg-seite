import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Wer in einer Szene mitspielt: Autor:in, alle, die geschrieben haben, und die „mit dabei“-Charaktere.
// Liefert die Besitzer:innen dieser Charaktere (ohne `userId`), je Person mit ihren Charakteren in der Szene.
// `characterIds` grenzt die Auswahl ein (nur Charaktere, die wirklich mitspielen, zählen).
export async function sceneRecipients(
  supabase: SupabaseServerClient,
  storyPostId: string,
  authorCharacterId: string,
  userId: string,
  characterIds?: string[],
): Promise<Map<string, { id: string; name: string }[]>> {
  const [{ data: writers }, { data: castRows }] = await Promise.all([
    supabase.from("story_entries").select("character_id").eq("story_post_id", storyPostId),
    supabase.from("story_post_cast").select("character_id").eq("story_post_id", storyPostId),
  ]);
  const involved = new Set<string>([authorCharacterId, ...(writers ?? []).map((w) => w.character_id as string), ...(castRows ?? []).map((c) => c.character_id as string)]);
  const wanted = characterIds?.length ? characterIds.filter((id) => involved.has(id)) : [...involved];
  const byOwner = new Map<string, { id: string; name: string }[]>();
  if (wanted.length === 0) return byOwner;
  const { data: targets } = await supabase.from("characters").select("id, owner_id, name").in("id", wanted);
  for (const t of targets ?? []) {
    if (!t.owner_id || t.owner_id === userId) continue;
    byOwner.set(t.owner_id, [...(byOwner.get(t.owner_id) ?? []), { id: t.id, name: t.name }]);
  }
  return byOwner;
}
