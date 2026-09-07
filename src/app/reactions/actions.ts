"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";

async function getActiveCharacterId(userId: string) {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value;

  const supabase = await createClient();

  if (cookieId) {
    const { data } = await supabase
      .from("characters")
      .select("id")
      .eq("id", cookieId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (data) return data.id;
  }

  const activeWorld = await getActiveWorld(userId);
  if (!activeWorld) return null;

  const { data: fallback } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", userId)
    .eq("world_id", activeWorld.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallback?.id ?? null;
}

export async function toggleReaction(
  target: { postId: string } | { messageId: string; characterId: string },
  emoji: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const characterId = "postId" in target ? await getActiveCharacterId(user.id) : target.characterId;
  if (!characterId) return "Du brauchst zuerst einen Charakter.";

  const column = "postId" in target ? "post_id" : "message_id";
  const targetId = "postId" in target ? target.postId : target.messageId;

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("character_id", characterId)
    .eq(column, targetId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
  } else {
    const { error } = await supabase
      .from("reactions")
      .insert({ character_id: characterId, emoji, [column]: targetId });
    if (error) return error.message;
  }

  if ("postId" in target) revalidatePath("/");
  return null;
}
