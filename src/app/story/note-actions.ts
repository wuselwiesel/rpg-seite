"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX = 5000;

// Eigene, nur für dich sichtbare Notiz zu einer Szene (die Datenbank erlaubt nur die eigene Zeile)
export async function saveSceneNote(storyPostId: string, body: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const text = body.trim();
  if (text.length > MAX) return `Die Notiz ist zu lang (höchstens ${MAX} Zeichen).`;

  const { data: post } = await supabase.from("story_posts").select("world_id").eq("id", storyPostId).maybeSingle<{ world_id: string }>();
  if (!post) return "Szene nicht gefunden.";

  if (!text) {
    const { error } = await supabase.from("scene_notes").delete().eq("story_post_id", storyPostId).eq("user_id", user.id);
    if (error) return error.message;
  } else {
    const { error } = await supabase.from("scene_notes").upsert(
      { story_post_id: storyPostId, user_id: user.id, world_id: post.world_id, body: text, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: "story_post_id,user_id" },
    );
    if (error) return error.message;
  }
  revalidatePath(`/story/${storyPostId}`);
  return null;
}
