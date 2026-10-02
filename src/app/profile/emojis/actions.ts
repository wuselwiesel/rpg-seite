"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { EMOJI_NAME } from "@/lib/custom-emoji";

const MAX_EMOJIS_PER_WORLD = 100;

export async function createCustomEmoji(name: string, imageUrl: string): Promise<string | null> {
  const clean = name.trim().toLowerCase();
  if (!EMOJI_NAME.test(clean)) return "Name: 2–32 Zeichen, nur Kleinbuchstaben, Zahlen und Unterstrich.";
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/`;
  if (!imageUrl.startsWith(storage)) return "Ungültiges Bild.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const world = await getActiveWorld(user.id);
  if (!world) return "Wähle zuerst eine Welt.";

  const { count } = await supabase
    .from("custom_emojis")
    .select("id", { count: "exact", head: true })
    .eq("world_id", world.id);
  if ((count ?? 0) >= MAX_EMOJIS_PER_WORLD) return `Pro Welt sind höchstens ${MAX_EMOJIS_PER_WORLD} Emojis möglich.`;

  const { error } = await supabase
    .from("custom_emojis")
    .insert({ world_id: world.id, name: clean, image_url: imageUrl, created_by: user.id });
  if (error) return error.code === "23505" ? `:${clean}: gibt es in dieser Welt schon.` : error.message;

  revalidatePath("/", "layout");
  return null;
}

export async function deleteCustomEmoji(id: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("custom_emojis").delete({ count: "exact" }).eq("id", id);
  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";
  revalidatePath("/", "layout");
  return null;
}
