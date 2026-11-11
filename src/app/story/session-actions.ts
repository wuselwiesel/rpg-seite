"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { getActiveCharacter } from "@/lib/active-character";
import { sceneRecipients } from "@/lib/scene-recipients";
import { cleanSessionText, clampStars, sessionNoticeMessage } from "@/lib/scene-session";

// „Session beenden“: legt den Rückblick an (Statistik rechnet die Datenbank selbst aus) und benachrichtigt die anderen Mitspielenden.
// An der Szene ändert sich nichts (nicht gesperrt, nicht archiviert).
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

// Eigene Bewertung einer Session speichern (Sterne 1 bis 5, was gefiel, was weniger); erneutes Speichern ändert sie.
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

  const character = await getActiveCharacter(user.id, session.story_posts.world_id);
  const { error } = await supabase.from("scene_session_ratings").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      character_id: character?.id ?? null,
      stars,
      liked: cleanSessionText(input.liked),
      disliked: cleanSessionText(input.disliked),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" },
  );
  if (error) return "Die Bewertung konnte nicht gespeichert werden.";
  revalidatePath(`/story/${session.story_post_id}`);
  return null;
}
