"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { extractHashtags } from "@/lib/hashtags";
import { getAcceptedFriends } from "@/lib/friends";
import { createNotification } from "@/lib/notifications";
import { isAllowedGifUrl } from "@/lib/gif";
import { getAllMentionableCharacters } from "@/lib/redaktion";
import { fetchRedaktionPage } from "@/lib/redaktion-feed";
import type { RedaktionFeedPost, RedaktionFilters } from "@/lib/redaktion-feed-types";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Gleiche Beitragsarten wie im normalen Feed (createPost): Text (volles RichText), Foto (bis zu 10,
// Bildunterschrift als Klartext) oder Video. Bei Foto/Video ist der Inhalt nur eine Bildunterschrift -
// dadurch rendert ein reiner Text-Beitrag als einfacher Text (wie bei Reddit/Threads), nicht als
// Bild-Kachel mit Text, weil das "post-content" direkt ohne Medien-Rahmen angezeigt wird.
export async function createRedaktionPost(_prevState: string | null, formData: FormData) {
  const kind = String(formData.get("kind") ?? "text");
  const mediaType = kind === "image" || kind === "video" ? kind : null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ownStorage = (url: string) => Boolean(supabaseUrl) && url.startsWith(`${supabaseUrl}/storage/`);
  const allowedImage = (url: string) => ownStorage(url) || isAllowedGifUrl(url);

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

  const storyPostId = String(formData.get("story_post_id") ?? "").trim() || null;

  const rawContent = String(formData.get("content") ?? "").trim();
  const content = mediaType
    ? sanitizePostHtml(rawContent ? `<p>${escapeHtml(rawContent).replace(/\n/g, "<br>")}</p>` : "")
    : sanitizePostHtml(rawContent);

  const pollCharacterMode = formData.get("poll_character_mode") === "on";
  const pollOptionLabels = formData
    .getAll("poll_option")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 20);
  const hasPoll = pollCharacterMode || pollOptionLabels.length >= 2;

  const hasContent = Boolean(mediaType) || stripHtml(content).length > 0 || content.includes("<img");
  if (!hasContent && !hasPoll) {
    return "Der Beitrag darf nicht leer sein.";
  }
  if (!pollCharacterMode && pollOptionLabels.length === 1) {
    return "Eine Umfrage braucht mindestens zwei Optionen.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const pollMultiSelect = formData.get("poll_multi_select") === "on";
  const pollShowVoters = formData.get("poll_show_voters") === "on";
  const closesRaw = String(formData.get("poll_closes_at") ?? "").trim();
  const closesDate = closesRaw ? new Date(closesRaw) : null;
  const pollClosesAt = closesDate && !Number.isNaN(closesDate.getTime()) ? closesDate.toISOString() : null;

  const { data: post, error } = await supabase
    .from("redaktion_posts")
    .insert({
      author_id: user.id,
      content,
      media_url: mediaType ? mediaUrl : null,
      media_type: mediaType,
      media_urls: mediaType === "image" && mediaUrls.length > 1 ? mediaUrls : null,
      story_post_id: storyPostId,
      tags: extractHashtags(stripHtml(content)),
      poll_multi_select: hasPoll ? pollMultiSelect : false,
      poll_show_voters: hasPoll ? pollShowVoters : false,
      poll_character_mode: hasPoll ? pollCharacterMode : false,
      poll_closes_at: hasPoll ? pollClosesAt : null,
    })
    .select("id")
    .single();

  if (error || !post) return error?.message ?? "Beitrag konnte nicht erstellt werden.";

  if (hasPoll) {
    if (pollCharacterMode) {
      const characters = await getAllMentionableCharacters(user.id);
      if (characters.length < 2) {
        await supabase.from("redaktion_posts").delete().eq("id", post.id);
        return "Für eine Charakter-Umfrage braucht es mindestens zwei Charaktere.";
      }
      await supabase.from("redaktion_poll_options").insert(
        characters.map((c, i) => ({ post_id: post.id, label: c.name, character_id: c.id, position: i })),
      );
    } else {
      await supabase.from("redaktion_poll_options").insert(
        pollOptionLabels.map((label, i) => ({ post_id: post.id, label, position: i })),
      );
    }
  }

  const friends = await getAcceptedFriends(user.id);
  if (friends.length > 0) {
    const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle();
    const actorName = me?.nickname || me?.username || "Jemand";
    await Promise.all(
      friends.map((f) =>
        createNotification(supabase, {
          userId: f.id,
          type: "redaktion_post",
          actorName,
          actorAvatarUrl: me?.avatar_url ?? null,
          link: `/redaktion/${post.id}`,
          message: hasPoll ? "hat eine neue Umfrage gestartet" : "hat etwas in der Redaktion gepostet",
        }),
      ),
    );
  }

  revalidatePath("/redaktion");
  return null;
}

export async function deleteRedaktionPost(postId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("redaktion_posts")
    .delete({ count: "exact" })
    .eq("id", postId)
    .eq("author_id", user.id);
  if (error) return error.message;
  if (!count) return "Keine Berechtigung dafür.";

  revalidatePath("/redaktion");
  return null;
}

// Stimme setzen/entfernen. Bei Einfachauswahl werden vorherige Stimmen für denselben Post
// zuerst entfernt, damit immer nur eine Option aktiv ist.
export async function voteRedaktionPoll(postId: string, optionId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: post } = await supabase
    .from("redaktion_posts")
    .select("poll_multi_select, poll_closes_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return "Umfrage nicht gefunden.";
  if (post.poll_closes_at && new Date(post.poll_closes_at).getTime() < Date.now()) {
    return "Diese Umfrage ist geschlossen.";
  }

  const { data: existing } = await supabase
    .from("redaktion_poll_votes")
    .select("id")
    .eq("option_id", optionId)
    .eq("voter_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("redaktion_poll_votes").delete().eq("id", existing.id);
    if (error) return error.message;
  } else {
    if (!post.poll_multi_select) {
      const { data: options } = await supabase.from("redaktion_poll_options").select("id").eq("post_id", postId);
      const optionIds = (options ?? []).map((o) => o.id);
      if (optionIds.length > 0) {
        await supabase.from("redaktion_poll_votes").delete().eq("voter_id", user.id).in("option_id", optionIds);
      }
    }
    const { error } = await supabase.from("redaktion_poll_votes").insert({ option_id: optionId, voter_id: user.id });
    if (error) return error.message;
  }

  revalidatePath(`/redaktion/${postId}`);
  revalidatePath("/redaktion");
  return null;
}

export async function createRedaktionComment(
  postId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return "Kommentar darf nicht leer sein.";
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase.from("redaktion_comments").insert({
    post_id: postId,
    author_id: user.id,
    content,
    parent_id: parentId,
  });
  if (error) return error.message;

  const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle();
  const actorName = me?.nickname || me?.username || "Jemand";

  const notifyTargets = new Set<string>();
  if (parentId) {
    const { data: parent } = await supabase.from("redaktion_comments").select("author_id").eq("id", parentId).maybeSingle();
    if (parent && parent.author_id !== user.id) notifyTargets.add(parent.author_id);
  }
  const { data: post } = await supabase.from("redaktion_posts").select("author_id").eq("id", postId).maybeSingle();
  if (post && post.author_id !== user.id) notifyTargets.add(post.author_id);

  await Promise.all(
    Array.from(notifyTargets).map((targetUserId) =>
      createNotification(supabase, {
        userId: targetUserId,
        type: "redaktion_comment",
        actorName,
        actorAvatarUrl: me?.avatar_url ?? null,
        link: `/redaktion/${postId}`,
        message: "hat in der Redaktion kommentiert",
      }),
    ),
  );

  revalidatePath(`/redaktion/${postId}`);
  return null;
}

export async function deleteRedaktionComment(commentId: string, postId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("redaktion_comments")
    .delete({ count: "exact" })
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) return error.message;
  if (!count) return "Keine Berechtigung dafür.";

  revalidatePath(`/redaktion/${postId}`);
  return null;
}

export async function saveRedaktionProfile(_prevState: string | null, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const bannerRaw = String(formData.get("banner_url") ?? "").trim();
  const bannerUrl = supabaseUrl && bannerRaw.startsWith(`${supabaseUrl}/storage/`) ? bannerRaw : null;

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 600);
  const statusText = String(formData.get("status_text") ?? "").trim().slice(0, 80);

  const hex = /^#[0-9a-fA-F]{6}$/;
  const font = String(formData.get("theme_font") ?? "").trim();
  const accent = String(formData.get("theme_accent") ?? "").trim();
  const bg = String(formData.get("theme_bg") ?? "").trim();

  const icons = formData.getAll("field_icon").map(String);
  const titles = formData.getAll("field_title").map(String);
  const texts = formData.getAll("field_text").map(String);
  const fields = titles
    .map((title, i) => ({
      icon: Array.from((icons[i] ?? "").trim()).slice(0, 2).join(""),
      title: title.trim().slice(0, 40),
      text: (texts[i] ?? "").trim().slice(0, 300),
    }))
    .filter((f) => f.title && f.text)
    .slice(0, 12);

  const pinned = Array.from(new Set(formData.getAll("pinned").map(String))).slice(0, 3);
  if (pinned.length > 0) {
    const { data: own } = await supabase
      .from("redaktion_posts")
      .select("id")
      .eq("author_id", user.id)
      .in("id", pinned);
    const ownIds = new Set((own ?? []).map((p) => p.id as string));
    for (let i = pinned.length - 1; i >= 0; i--) if (!ownIds.has(pinned[i])) pinned.splice(i, 1);
  }

  const { error } = await supabase.from("redaktion_profiles").upsert({
    user_id: user.id,
    bio: bio || null,
    status_text: statusText || null,
    banner_url: bannerUrl,
    theme_font: font && /^[a-zA-Z0-9]{1,40}$/.test(font) ? font : null,
    theme_accent: hex.test(accent) ? accent : null,
    theme_bg: hex.test(bg) ? bg : null,
    custom_fields: fields,
    pinned_post_ids: pinned,
    updated_at: new Date().toISOString(),
  });
  if (error) return error.message;

  revalidatePath(`/redaktion/profil/${user.id}`);
  redirect(`/redaktion/profil/${user.id}`);
}

export async function loadMoreRedaktionPosts(filters: RedaktionFilters, before: string): Promise<RedaktionFeedPost[]> {
  return fetchRedaktionPage(filters, before);
}
