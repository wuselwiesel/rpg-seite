"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { extractHashtags } from "@/lib/hashtags";
import { notifyMentionedCharacters, createNotification } from "@/lib/notifications";

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

export async function createPost(_prevState: string | null, formData: FormData) {
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);

  const hasContent = stripHtml(content).length > 0 || content.includes("<img");
  if (!hasContent) {
    return "Der Beitrag darf nicht leer sein.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nicht angemeldet.";

  const characterId = await getActiveCharacterId(user.id);
  if (!characterId) return "Du brauchst zuerst einen Charakter.";

  const tags = extractHashtags(stripHtml(content));

  const { data, error } = await supabase
    .from("posts")
    .insert({ character_id: characterId, title: "", content, tags })
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

  const { data: post } = await supabase
    .from("posts")
    .select("character_id, characters(owner_id)")
    .eq("id", postId)
    .maybeSingle<{ character_id: string; characters: { owner_id: string } | null }>();

  if (post && post.character_id !== characterId && post.characters?.owner_id) {
    const { data: actor } = await supabase
      .from("characters")
      .select("name, avatar_url")
      .eq("id", characterId)
      .maybeSingle();

    await createNotification(supabase, {
      userId: post.characters.owner_id,
      type: "comment",
      actorName: actor?.name ?? "Jemand",
      actorAvatarUrl: actor?.avatar_url ?? null,
      link: `/posts/${postId}`,
      message: "hat deinen Beitrag kommentiert",
    });
  }

  await notifyMentionedCharacters(
    content,
    user.id,
    characterId,
    `/posts/${postId}`,
    "hat dich in einem Kommentar erwähnt",
  );

  revalidatePath(`/posts/${postId}`);
  return null;
}

export async function updateComment(
  commentId: string,
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

  const { error } = await supabase
    .from("comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return error.message;

  revalidatePath(`/posts/${postId}`);
  return null;
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("comments")
    .delete({ count: "exact" })
    .eq("id", commentId);

  if (error) return error.message;
  if (!count) return "Kommentar konnte nicht gelöscht werden.";

  revalidatePath(`/posts/${postId}`);
  return null;
}

export async function toggleLike(target: { postId: string } | { commentId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const characterId = await getActiveCharacterId(user.id);
  if (!characterId) return;

  const column = "postId" in target ? "post_id" : "comment_id";
  const targetId = "postId" in target ? target.postId : target.commentId;

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("character_id", characterId)
    .eq(column, targetId)
    .maybeSingle();

  let postIdForRevalidate = "postId" in target ? target.postId : null;

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
  } else {
    await supabase.from("likes").insert({ character_id: characterId, [column]: targetId });

    let ownerId: string | null = null;
    let ownerCharacterId: string | null = null;
    if ("postId" in target) {
      const { data: post } = await supabase
        .from("posts")
        .select("character_id, characters(owner_id)")
        .eq("id", target.postId)
        .maybeSingle<{ character_id: string; characters: { owner_id: string } | null }>();
      ownerId = post?.characters?.owner_id ?? null;
      ownerCharacterId = post?.character_id ?? null;
    } else {
      const { data: comment } = await supabase
        .from("comments")
        .select("post_id, character_id, characters(owner_id)")
        .eq("id", target.commentId)
        .maybeSingle<{ post_id: string; character_id: string; characters: { owner_id: string } | null }>();
      ownerId = comment?.characters?.owner_id ?? null;
      ownerCharacterId = comment?.character_id ?? null;
      postIdForRevalidate = comment?.post_id ?? null;
    }

    if (ownerId && ownerCharacterId && ownerCharacterId !== characterId) {
      const { data: actor } = await supabase
        .from("characters")
        .select("name, avatar_url")
        .eq("id", characterId)
        .maybeSingle();

      await createNotification(supabase, {
        userId: ownerId,
        type: "like",
        actorName: actor?.name ?? "Jemand",
        actorAvatarUrl: actor?.avatar_url ?? null,
        link: `/posts/${postIdForRevalidate}`,
        message: "postId" in target ? "gefällt dein Beitrag" : "gefällt dein Kommentar",
      });
    }
  }

  revalidatePath("/");
  if (postIdForRevalidate) revalidatePath(`/posts/${postIdForRevalidate}`);
}
