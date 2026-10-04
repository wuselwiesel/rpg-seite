import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { canEditCharacter, canToggleNpc } from "@/lib/npc";

// Besitzerin einer Welt (für die Frage, wer NPCs bearbeiten darf)
export const getWorldOwnerId = cache(async (worldId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("created_by").eq("id", worldId).maybeSingle<{ created_by: string }>();
  return data?.created_by ?? null;
});

export async function getCharacterAccess(character: { owner_id: string; is_npc?: boolean | null; world_id: string }, userId: string) {
  const worldOwnerId = await getWorldOwnerId(character.world_id);
  return { canEdit: canEditCharacter(character, userId, worldOwnerId), canToggle: canToggleNpc(character, userId), worldOwnerId };
}

// Vornamen (klein geschrieben) aller Charaktere der Welt, damit gewürfelte Namen sich nicht doppeln
export async function getWorldFirstNames(worldId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("name").eq("world_id", worldId).returns<{ name: string }[]>();
  const out = new Set<string>();
  for (const c of data ?? []) {
    const first = c.name.trim().split(/\s+/)[0];
    if (first) out.add(first.toLowerCase());
  }
  return [...out];
}
