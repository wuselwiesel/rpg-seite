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
import { isAllowedGifUrl } from "@/lib/gif";
import { notifyMentionedCharacters, createNotification } from "@/lib/notifications";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
  const kind = String(formData.get("kind") ?? "text");
  const mediaType = kind === "image" || kind === "video" ? kind : null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ownStorage = (url: string) => Boolean(supabaseUrl) && url.startsWith(`${supabaseUrl}/storage/`);
  const allowedImage = (url: string) => ownStorage(url) || isAllowedGifUrl(url);

  // Fotos (bis 10) kommen als JSON-Liste, ein Video als einzelne URL.
  let mediaUrls: string[] = [];
  if (mediaType === "image") {
    try {
      const parsed = JSON.parse(String(formData.get("media_urls") ?? "[]"));
      if (Array.isArray(parsed)) mediaUrls = parsed.map(String).filter(allowedImage).slice(0, 10);
    } catch {
      /* ungültige Liste ignorieren */
    }
  } else if (mediaType === "video") {
    const single = String(formData.get("media_url") ?? "").trim();
    if (ownStorage(single)) mediaUrls = [single];
  }
  if (mediaType && mediaUrls.length === 0) {
    return mediaType === "video" ? "Bitte wähle ein Video aus." : "Bitte wähle mindestens ein Foto aus.";
  }
  const mediaUrl = mediaUrls[0] ?? "";

  const publishRaw = String(formData.get("publish_at") ?? "");
  const publishDate = publishRaw ? new Date(publishRaw) : null;
  const publishAt =
    publishDate && !Number.isNaN(publishDate.getTime()) && publishDate.getTime() > Date.now() + 15_000
      ? publishDate.toISOString()
      : new Date().toISOString();
  const isScheduled = new Date(publishAt).getTime() > Date.now() + 15_000;
  const storyPostId = String(formData.get("story_post_id") ?? "").trim() || null;

  const rawContent = String(formData.get("content") ?? "").trim();
  // Bei Foto/Video ist der Inhalt nur die Bildunterschrift (Klartext).
  const content = mediaType
    ? sanitizePostHtml(rawContent ? `<p>${escapeHtml(rawContent).replace(/\n/g, "<br>")}</p>` : "")
    : sanitizePostHtml(rawContent);

  const hasContent = Boolean(mediaType) || stripHtml(content).length > 0 || content.includes("<img");
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
    .insert({
      character_id: characterId,
      title: "",
      content,
      tags,
      media_url: mediaType ? mediaUrl : null,
      media_type: mediaType,
      media_urls: mediaType === "image" && mediaUrls.length > 1 ? mediaUrls : null,
      publish_at: publishAt,
      story_post_id: storyPostId,
    })
    .select("id")
    .single();

  if (error || !data) return error?.message ?? "Post konnte nicht erstellt werden.";

  // Markierte Charaktere (wie bei Instagram): speichern und benachrichtigen.
  const taggedIds = Array.from(new Set(formData.getAll("tagged_character_id").map(String))).filter((id) => id !== characterId).slice(0, 20);
  if (taggedIds.length > 0) {
    const { data: taggedChars } = await supabase.from("characters").select("id, owner_id, name").in("id", taggedIds);
    const valid = taggedChars ?? [];
    if (valid.length > 0) {
      await supabase.from("post_tags").insert(valid.map((c) => ({ post_id: data.id, character_id: c.id })));
      if (!isScheduled) {
        const { data: actor } = await supabase.from("characters").select("name, avatar_url").eq("id", characterId).maybeSingle();
        await Promise.all(
          valid
            .filter((c) => c.owner_id !== user.id)
            .map((c) =>
              createNotification(supabase, {
                userId: c.owner_id,
                type: "mention",
                actorName: actor?.name ?? "Jemand",
                actorAvatarUrl: actor?.avatar_url ?? null,
                link: `/posts/${data.id}`,
                message: "hat dich in einem Beitrag markiert",
                recipientName: c.name,
              }),
            ),
        );
      }
    }
  }

  revalidatePath("/");
  redirect(isScheduled ? `/characters/${characterId}?tab=scheduled` : `/posts/${data.id}`);
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

  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, character_id: characterId, content, parent_id: parentId });

  if (error) return error.message;

  // Antwort auf einen Kommentar: Besitzer:in des Kommentars benachrichtigen.
  if (parentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("character_id, characters(owner_id, name)")
      .eq("id", parentId)
      .maybeSingle<{ character_id: string; characters: { owner_id: string; name: string } | null }>();
    if (parent && parent.character_id !== characterId && parent.characters?.owner_id) {
      const { data: actor } = await supabase
        .from("characters")
        .select("name, avatar_url")
        .eq("id", characterId)
        .maybeSingle();
      await createNotification(supabase, {
        userId: parent.characters.owner_id,
        type: "comment",
        actorName: actor?.name ?? "Jemand",
        actorAvatarUrl: actor?.avatar_url ?? null,
        link: `/posts/${postId}`,
        message: "hat auf deinen Kommentar geantwortet",
        recipientName: parent.characters.name,
      });
    }
  }

  const { data: post } = await supabase
    .from("posts")
    .select("character_id, characters(owner_id, name)")
    .eq("id", postId)
    .maybeSingle<{ character_id: string; characters: { owner_id: string; name: string } | null }>();

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
      recipientName: post.characters.name,
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
    let ownerName: string | null = null;
    if ("postId" in target) {
      const { data: post } = await supabase
        .from("posts")
        .select("character_id, characters(owner_id, name)")
        .eq("id", target.postId)
        .maybeSingle<{ character_id: string; characters: { owner_id: string; name: string } | null }>();
      ownerName = post?.characters?.name ?? null;
      ownerId = post?.characters?.owner_id ?? null;
      ownerCharacterId = post?.character_id ?? null;
    } else {
      const { data: comment } = await supabase
        .from("comments")
        .select("post_id, character_id, characters(owner_id, name)")
        .eq("id", target.commentId)
        .maybeSingle<{ post_id: string; character_id: string; characters: { owner_id: string; name: string } | null }>();
      ownerName = comment?.characters?.name ?? null;
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
        recipientName: ownerName,
      });
    }
  }

  revalidatePath("/");
  if (postIdForRevalidate) revalidatePath(`/posts/${postIdForRevalidate}`);
}

export async function togglePinPost(postId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: post } = await supabase
    .from("posts")
    .select("id, pinned, character_id")
    .eq("id", postId)
    .maybeSingle<{ id: string; pinned: boolean; character_id: string }>();
  if (!post) return "Beitrag nicht gefunden.";

  if (!post.pinned) {
    const { count } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("character_id", post.character_id)
      .eq("pinned", true);
    if ((count ?? 0) >= 3) return "Du kannst höchstens 3 Beiträge anpinnen.";
  }

  const { error, count } = await supabase
    .from("posts")
    .update({ pinned: !post.pinned }, { count: "exact" })
    .eq("id", postId);
  if (error) return error.message;
  if (!count) return "Nur eigene Beiträge können angepinnt werden.";

  revalidatePath(`/posts/${postId}`);
  revalidatePath(`/characters/${post.character_id}`);
  return null;
}

// Erlaubt, den angezeigten Zeitpunkt eines eigenen Beitrags nachträglich zu verschieben (z.B. um eine
// glaubwürdige Zeitlinie herzustellen) - unabhängig von publish_at, das nur fürs Vorausplanen gilt.
export async function updatePostCreatedAt(postId: string, isoDate: string): Promise<string | null> {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Ungültiges Datum.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  // RLS (posts_update_own) lässt nur eigene Beiträge zu; count zeigt, ob wirklich etwas geändert wurde.
  const { error, count } = await supabase
    .from("posts")
    .update({ created_at: date.toISOString() }, { count: "exact" })
    .eq("id", postId);
  if (error) return "Speichern fehlgeschlagen.";
  if (!count) return "Beitrag nicht gefunden.";

  revalidatePath("/");
  revalidatePath(`/posts/${postId}`);
  return null;
}

export async function deletePost(postId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  // RLS (posts_delete_own) lässt nur eigene Beiträge zu; count zeigt, ob wirklich etwas gelöscht wurde.
  const { error, count } = await supabase.from("posts").delete({ count: "exact" }).eq("id", postId);
  if (error) return "Löschen fehlgeschlagen.";
  if (!count) return "Beitrag nicht gefunden.";

  revalidatePath("/");
  return null;
}
