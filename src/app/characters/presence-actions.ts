"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Online/Offline eines eigenen Charakters setzen (bleibt, bis man es ändert)
export async function setCharacterPresence(characterId: string, online: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("characters").update({ presence_online: online }, { count: "exact" }).eq("id", characterId).eq("owner_id", user.id);
  if (error) return error.message;
  if (!count) return "Das ist nicht dein Charakter.";
  revalidatePath("/", "layout");
  return null;
}
