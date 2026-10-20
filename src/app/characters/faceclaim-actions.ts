"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Faceclaim = { name: string; link: string; images: string[] };

const MAX_IMAGES = 8;

// Faceclaim nur für dich: liegt in character_private (jede:r sieht und ändert nur die eigene Zeile)
export async function saveFaceclaim(characterId: string, input: Faceclaim): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const name = input.name.trim().slice(0, 120);
  let link = input.link.trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link.length > 500) return "Der Link ist zu lang.";
  const images = input.images.filter((u) => /^https:\/\//.test(u) && u.length <= 600).slice(0, MAX_IMAGES);

  if (!name && !link && images.length === 0) {
    const { error } = await supabase.from("character_private").delete().eq("character_id", characterId).eq("owner_id", user.id);
    if (error) return error.message;
  } else {
    const { error } = await supabase.from("character_private").upsert(
      { character_id: characterId, owner_id: user.id, faceclaim: name || null, faceclaim_link: link || null, faceclaim_images: images, updated_at: new Date().toISOString() },
      { onConflict: "character_id,owner_id" },
    );
    if (error) return error.message;
  }
  revalidatePath(`/characters/${characterId}`);
  revalidatePath(`/characters/${characterId}/chabo`);
  return null;
}
