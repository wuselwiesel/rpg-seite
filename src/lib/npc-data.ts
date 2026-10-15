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

// Besitzer:in und ernannte Admins einer Welt (sie dürfen NPCs und freie Rollen bearbeiten und vergeben)
export const getWorldAdminIds = cache(async (worldId: string): Promise<string[]> => {
  const supabase = await createClient();
  const [ownerId, { data }] = await Promise.all([
    getWorldOwnerId(worldId),
    supabase.from("world_members").select("user_id").eq("world_id", worldId).eq("role", "admin").returns<{ user_id: string }[]>(),
  ]);
  return [...new Set([...(ownerId ? [ownerId] : []), ...(data ?? []).map((r) => r.user_id)])];
});

export async function getCharacterAccess(character: { owner_id: string; is_npc?: boolean | null; world_id: string }, userId: string) {
  const worldAdminIds = await getWorldAdminIds(character.world_id);
  const worldOwnerId = await getWorldOwnerId(character.world_id);
  return {
    isWorldOwner: worldOwnerId === userId,
    canEdit: canEditCharacter(character, userId, worldAdminIds),
    canToggle: canToggleNpc(character, userId),
    // Admins vergeben freie Rollen (NPCs), auch wenn sie sie nicht selbst angelegt haben
    canOffer: Boolean(character.is_npc) && worldAdminIds.includes(userId),
    worldAdminIds,
  };
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
