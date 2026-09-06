"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { sanitizePostHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";

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

  const { data: fallback } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallback?.id ?? null;
}

export async function createPost(_prevState: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);

  const hasContent = stripHtml(content).length > 0 || content.includes("<img");
  if (!title || !hasContent) {
    return "Titel und Inhalt dürfen nicht leer sein.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nicht angemeldet.";

  const characterId = await getActiveCharacterId(user.id);
  if (!characterId) return "Du brauchst zuerst einen Charakter.";

  const { data, error } = await supabase
    .from("posts")
    .insert({ character_id: characterId, title, content })
    .select("id")
    .single();

  if (error || !data) return error?.message ?? "Post konnte nicht erstellt werden.";

  revalidatePath("/");
  redirect(`/posts/${data.id}`);
}

export async function createComment(
  postId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return "Kommentar darf nicht leer sein.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nicht angemeldet.";

  const characterId = await getActiveCharacterId(user.id);
  if (!characterId) return "Du brauchst zuerst einen Charakter.";

  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, character_id: characterId, content });

  if (error) return error.message;

  revalidatePath(`/posts/${postId}`);
  return null;
}
