"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
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

    // Herz auf einen Beitrag: die Besitzer:in benachrichtigen (gebündelt, siehe create_notification).
    if ("postId" in target && emoji === "❤️") {
      const { data: post } = await supabase
        .from("posts")
        .select("character_id, characters!posts_character_id_fkey(owner_id, name)")
        .eq("id", target.postId)
        .maybeSingle<{ character_id: string; characters: { owner_id: string; name: string } | null }>();
      if (post?.characters?.owner_id && post.character_id !== characterId) {
        const { data: actor } = await supabase.from("characters").select("name, avatar_url").eq("id", characterId).maybeSingle();
        await createNotification(supabase, {
          userId: post.characters.owner_id,
          type: "like",
          actorName: actor?.name ?? "Jemand",
          actorAvatarUrl: actor?.avatar_url ?? null,
          link: `/posts/${target.postId}`,
          message: "gefällt dein Beitrag",
          recipientName: post.characters.name,
        });
      }
    }
  }

  if ("postId" in target) revalidatePath("/");
  return null;
}

export type Reactor = {
  emoji: string;
  character: { id: string; name: string; username: string | null; avatar_url: string | null };
};

export async function getPostReactors(postId: string): Promise<Reactor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reactions")
    .select("emoji, created_at, characters(id, name, username, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  return (data ?? [])
    .map((row) => {
      const character = (row as unknown as { characters: Reactor["character"] | null }).characters;
      return character ? { emoji: row.emoji as string, character } : null;
    })
    .filter((r): r is Reactor => r !== null);
}
