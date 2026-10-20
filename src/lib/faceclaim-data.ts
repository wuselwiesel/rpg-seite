import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Faceclaim } from "@/app/characters/faceclaim-actions";

// Das eigene Faceclaim zu einem Charakter (RLS gibt nur die eigene Zeile heraus)
export async function getFaceclaim(supabase: SupabaseClient, characterId: string, userId: string): Promise<Faceclaim> {
  const { data } = await supabase
    .from("character_private")
    .select("faceclaim, faceclaim_link, faceclaim_images")
    .eq("character_id", characterId)
    .eq("owner_id", userId)
    .maybeSingle<{ faceclaim: string | null; faceclaim_link: string | null; faceclaim_images: string[] | null }>();
  return { name: data?.faceclaim ?? "", link: data?.faceclaim_link ?? "", images: data?.faceclaim_images ?? [] };
}

// Eigene Faceclaim-Namen mehrerer Charaktere auf einmal (für Listen)
export async function getFaceclaimNames(supabase: SupabaseClient, userId: string, characterIds: string[]): Promise<Map<string, string>> {
  if (characterIds.length === 0) return new Map();
  const { data } = await supabase.from("character_private").select("character_id, faceclaim").eq("owner_id", userId).in("character_id", characterIds).not("faceclaim", "is", null);
  return new Map(((data ?? []) as { character_id: string; faceclaim: string }[]).filter((r) => r.faceclaim.trim()).map((r) => [r.character_id, r.faceclaim]));
}
