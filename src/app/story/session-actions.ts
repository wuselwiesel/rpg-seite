"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { getActiveCharacter } from "@/lib/active-character";
import { sceneRecipients } from "@/lib/scene-recipients";
import { cleanSessionText, clampStars, sessionNoticeMessage } from "@/lib/scene-session";

// „Session beenden“: legt den Rückblick an (Statistik rechnet die Datenbank selbst aus) und benachrichtigt die anderen Mitspielenden.
// An der Szene ändert sich nichts (nicht gesperrt, nicht archiviert); in die Redaktion kommt nichts automatisch (siehe postSessionToRedaktion).
export async function endSceneSession(storyPostId: string): Promise<{ ok: true; sessionId: string } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Nicht angemeldet." };

  const { data: post } = await supabase.from("story_posts").select("title, world_id, character_id").eq("id", storyPostId).maybeSingle();
  if (!post) return { ok: false, message: "Szene nicht gefunden." };

  const { data: sessionId, error } = await supabase.rpc("end_scene_session", { p_story_post_id: storyPostId });
  if (error || typeof sessionId !== "string") {
    // Die Datenbank meldet verständliche Gründe (leere Session, gerade erst beendet, keine Berechtigung) im Text
    const known = ["Seit dem letzten Beenden wurde nichts geschrieben", "Die Session wurde gerade eben schon beendet", "Keine Berechtigung"];
    const reason = known.find((k) => error?.message?.includes(k));
    return { ok: false, message: reason ? `${reason}.` : "Die Session konnte nicht beendet werden." };
  }

  // Benachrichtigen: Fehler dabei dürfen das Beenden nicht zunichtemachen
  try {
    const me = await getActiveCharacter(user.id, post.world_id);
    const byOwner = await sceneRecipients(supabase, storyPostId, post.character_id, user.id);
    const message = sessionNoticeMessage(post.title);
    await Promise.all(
      [...byOwner.entries()].map(([ownerId, chars]) =>
        createNotification(supabase, {
          userId: ownerId,
          type: "session_end",
          actorName: me?.name ?? "Jemand",
          actorAvatarUrl: me?.avatar_url ?? null,
          link: `/story/${storyPostId}?sitzung=${sessionId}`,
          message,
          recipientName: chars.map((c) => c.name).join(", "),
        }),
      ),
    );
  } catch {
    /* Beenden war erfolgreich, nur die Meldung blieb aus */
  }

  revalidatePath(`/story/${storyPostId}`);
  return { ok: true, sessionId };
}

// Eigene Bewertung einer Session speichern (Sterne 1 bis 5, was gefiel, was weniger); nur einmal – nachträglich nicht mehr änderbar.
export async function saveSessionRating(
  sessionId: string,
  input: { stars: number; liked?: string; disliked?: string },
): Promise<string | null> {
  const stars = clampStars(input.stars);
  if (!stars) return "Bitte 1 bis 5 Sterne wählen.";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return "Session nicht gefunden.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: session } = await supabase
    .from("scene_sessions")
    .select("story_post_id, story_posts(world_id)")
    .eq("id", sessionId)
    .maybeSingle<{ story_post_id: string; story_posts: { world_id: string } | null }>();
  if (!session?.story_posts) return "Session nicht gefunden.";

  // Bereits bewertet? Dann abweisen (keine nachträgliche Änderung)
  const { data: existing } = await supabase.from("scene_session_ratings").select("user_id").eq("session_id", sessionId).eq("user_id", user.id).maybeSingle();
  if (existing) return "Du hast diese Session bereits bewertet.";

  const character = await getActiveCharacter(user.id, session.story_posts.world_id);
  const { error } = await supabase.from("scene_session_ratings").insert({
    session_id: sessionId,
    user_id: user.id,
    character_id: character?.id ?? null,
    stars,
    liked: cleanSessionText(input.liked),
    disliked: cleanSessionText(input.disliked),
    updated_at: new Date().toISOString(),
  });
  if (error) return "Die Bewertung konnte nicht gespeichert werden.";
  revalidatePath(`/story/${session.story_post_id}`);
  return null;
}

// Eigene Bewertung der ganzen Szene speichern (nur bei abgeschlossener Szene, nur Mitspielende, nur einmal)
export async function saveSceneRating(
  storyPostId: string,
  input: { stars: number; liked?: string; disliked?: string },
): Promise<string | null> {
  const stars = clampStars(input.stars);
  if (!stars) return "Bitte 1 bis 5 Sterne wählen.";
  if (!/^[0-9a-f-]{36}$/i.test(storyPostId)) return "Szene nicht gefunden.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: post } = await supabase.from("story_posts").select("world_id, character_id, locked").eq("id", storyPostId).maybeSingle<{ world_id: string; character_id: string; locked: boolean }>();
  if (!post) return "Szene nicht gefunden.";
  if (!post.locked) return "Die Szene ist noch nicht abgeschlossen.";

  // Mitspielen heißt: eigener Charakter ist Autor:in, hat geschrieben oder ist „mit dabei“
  const { data: own } = await supabase.from("characters").select("id").eq("owner_id", user.id).eq("world_id", post.world_id);
  const ownIds = (own ?? []).map((c) => c.id as string);
  if (ownIds.length === 0) return "Nur Mitspielende können die Szene bewerten.";
  const [{ data: wrote }, { data: cast }] = await Promise.all([
    supabase.from("story_entries").select("id").eq("story_post_id", storyPostId).in("character_id", ownIds).limit(1),
    supabase.from("story_post_cast").select("character_id").eq("story_post_id", storyPostId).in("character_id", ownIds).limit(1),
  ]);
  if (!ownIds.includes(post.character_id) && !wrote?.length && !cast?.length) return "Nur Mitspielende können die Szene bewerten.";

  const { data: existing } = await supabase.from("scene_ratings").select("user_id").eq("story_post_id", storyPostId).eq("user_id", user.id).maybeSingle();
  if (existing) return "Du hast diese Szene bereits bewertet.";

  const character = await getActiveCharacter(user.id, post.world_id);
  const { error } = await supabase.from("scene_ratings").insert({
    story_post_id: storyPostId,
    user_id: user.id,
    character_id: character?.id ?? null,
    stars,
    liked: cleanSessionText(input.liked),
    disliked: cleanSessionText(input.disliked),
    updated_at: new Date().toISOString(),
  });
  if (error) return "Die Bewertung konnte nicht gespeichert werden.";
  revalidatePath(`/story/${storyPostId}`);
  return null;
}

// Rückblick von Hand in der Redaktion posten (im eigenen Namen; nur Mitspielende, nicht bei geheimen Szenen, einmal je Session)
export async function postSessionToRedaktion(sessionId: string, storyPostId: string): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false, message: "Session nicht gefunden." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Nicht angemeldet." };
  const { data, error } = await supabase.rpc("post_scene_session", { p_session_id: sessionId });
  if (error || typeof data !== "string") {
    const known = ["Geheime Szenen lassen sich nicht in der Redaktion posten", "Dieser Rückblick wurde schon in der Redaktion gepostet", "Keine Berechtigung", "Session nicht gefunden"];
    const reason = known.find((k) => error?.message?.includes(k));
    return { ok: false, message: reason ? `${reason}.` : "Der Rückblick konnte nicht gepostet werden." };
  }
  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/worlds/[id]/sessions", "page");
  revalidatePath("/redaktion");
  return { ok: true, postId: data };
}

// Titel einer Session setzen oder ändern (von jedem Mitspielenden)
export async function updateSessionTitle(sessionId: string, title: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return "Session nicht gefunden.";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("update_scene_session_title", {
    p_session_id: sessionId,
    p_title: title.trim().slice(0, 80),
  });
  if (error) {
    if (error.message?.includes("Keine Berechtigung")) return "Keine Berechtigung.";
    return "Der Titel konnte nicht gespeichert werden.";
  }
  return null;
}

// Anfang der nächsten Session an einer Nachricht festlegen; entryId null entfernt die Wahl (dann beginnt sie, wo die letzte endete)
export async function setSessionStart(storyPostId: string, entryId: string | null): Promise<string | null> {
  if (entryId !== null && !/^[0-9a-f-]{36}$/i.test(entryId)) return "Nachricht nicht gefunden.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("set_scene_session_start", { p_story_post_id: storyPostId, p_entry_id: entryId });
  if (error) {
    const known = ["Der Anfang muss nach dem Ende der letzten Session liegen", "Ein Kapitel kann kein Session-Anfang sein", "Nachricht nicht gefunden", "Keine Berechtigung"];
    const reason = known.find((k) => error.message.includes(k));
    return reason ? `${reason}.` : "Der Anfang konnte nicht gesetzt werden.";
  }
  revalidatePath(`/story/${storyPostId}`);
  return null;
}
