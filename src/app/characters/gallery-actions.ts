"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGES = 24;

export async function addGalleryImage(characterId: string, imageUrl: string, caption = ""): Promise<string | null> {
  if (!/^https:\/\//.test(imageUrl) || imageUrl.length > 600) return "Ungültiges Bild.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { count } = await supabase.from("character_gallery").select("id", { count: "exact", head: true }).eq("character_id", characterId);
  if ((count ?? 0) >= MAX_IMAGES) return `Maximal ${MAX_IMAGES} Bilder.`;
  const { error } = await supabase
    .from("character_gallery")
    .insert({ character_id: characterId, image_url: imageUrl, caption: caption.trim().slice(0, 140) || null, position: count ?? 0 });
  if (error) return error.message.includes("row-level security") ? "Nur die Besitzer:in kann Bilder hinzufügen." : error.message;
  revalidatePath(`/characters/${characterId}`);
  revalidatePath(`/characters/${characterId}/chabo`);
  return null;
}

export async function deleteGalleryImage(imageId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data: row } = await supabase.from("character_gallery").select("character_id").eq("id", imageId).maybeSingle<{ character_id: string }>();
  const { error, count } = await supabase.from("character_gallery").delete({ count: "exact" }).eq("id", imageId);
  if (error) return error.message;
  if (!count) return "Konnte nicht entfernt werden.";
  if (row) {
    revalidatePath(`/characters/${row.character_id}`);
    revalidatePath(`/characters/${row.character_id}/chabo`);
  }
  return null;
}
