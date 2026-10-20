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
