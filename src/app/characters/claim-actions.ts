"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { notifyWorldAdmins } from "@/lib/world-admin-notify";
import { cookies } from "next/headers";
import { ACTIVE_CHARACTER_COOKIE, ACTIVE_WORLD_COOKIE, SELECTION_COOKIE_OPTIONS } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function actor(supabase: Supabase, userId: string) {
  const { data } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", userId).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  return { name: data?.nickname || data?.username || "Jemand", avatarUrl: data?.avatar_url ?? null };
}

function refresh(worldId?: string, characterId?: string) {
  if (worldId) {
    revalidatePath(`/worlds/${worldId}`);
    revalidatePath(`/worlds/${worldId}/uebersicht`);
  }
  if (characterId) revalidatePath(`/characters/${characterId}`);
  revalidatePath("/characters");
  revalidatePath("/", "layout");
}

// Einen Charakter (NPC oder Hauptcharakter) zur Vergabe freigeben oder wieder zurücknehmen: die Besitzer:in, bei NPCs auch alle Admins der Welt
export async function setCharacterClaimable(characterId: string, claimable: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("characters").update({ claimable }).eq("id", characterId).select("id, world_id");
  if (error) return error.message;
  if (!data?.length) return "Das dürfen nur die Besitzer:in des Charakters und bei NPCs die Admins der Welt.";
  // Wer die Freigabe zurücknimmt, beendet offene Anfragen und Angebote
  if (!claimable) {
    await supabase.from("character_claims").update({ status: "withdrawn", decided_by: user.id, decided_at: new Date().toISOString() }).eq("character_id", characterId).eq("status", "pending");
  }
  refresh(data[0].world_id as string, characterId);
  return null;
}

// Mitglied fragt eine freie Rolle an
export async function requestCharacter(characterId: string, message: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("request_character", { p_character: characterId, p_message: message.trim().slice(0, 500) });
  if (error) return error.message;
  const r = data as { world_id: string; character_name: string; owner_id: string; is_npc: boolean };
  if (r.is_npc) {
    await notifyWorldAdmins(supabase, r.world_id, "role_request", user.id, `möchte die Rolle ${r.character_name} übernehmen`, `/worlds/${r.world_id}`);
  } else {
    // Hauptcharakter: die Besitzer:in entscheidet
    const who = await actor(supabase, user.id);
    await createNotification(supabase, {
      userId: r.owner_id,
      type: "character_offer",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/worlds/${r.world_id}`,
      message: `möchte deinen Charakter ${r.character_name} übernehmen`,
    });
  }
  refresh(r.world_id, characterId);
  return null;
}

// Admin bietet eine Rolle einer Person an (die Person muss annehmen)
export async function offerCharacter(characterId: string, userId: string, message: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  if (!userId) return "Bitte eine Person auswählen.";
  const { data, error } = await supabase.rpc("offer_character", { p_character: characterId, p_user: userId, p_message: message.trim().slice(0, 500) });
  if (error) return error.message;
  const r = data as { world_id: string; character_name: string };
  const who = await actor(supabase, user.id);
  await createNotification(supabase, {
    userId,
    type: "character_offer",
    actorName: who.name,
    actorAvatarUrl: who.avatarUrl,
    link: `/worlds/${r.world_id}`,
    message: `bietet dir die Rolle ${r.character_name} an`,
  });
  refresh(r.world_id, characterId);
  return null;
}

// Anfrage annehmen oder ablehnen (Admin) bzw. Angebot annehmen oder ablehnen (angebotene Person)
export async function decideCharacterClaim(claimId: string, approve: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("decide_character_claim", { p_claim: claimId, p_approve: approve });
  if (error) return error.message;
  const r = data as { kind: "request" | "offer"; approved: boolean; world_id: string; character_id: string; character_name: string; user_id: string; created_by: string | null };
  const who = await actor(supabase, user.id);
  if (r.kind === "request") {
    // Antwort an die anfragende Person
    await createNotification(supabase, {
      userId: r.user_id,
      type: "character_claim_result",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: r.approved ? `/characters/${r.character_id}` : `/worlds/${r.world_id}`,
      message: r.approved ? `hat dir die Rolle ${r.character_name} gegeben` : `hat deine Anfrage für ${r.character_name} abgelehnt`,
    });
  } else if (r.created_by && r.created_by !== user.id) {
    // Antwort an den Admin, der angeboten hat
    await createNotification(supabase, {
      userId: r.created_by,
      type: "character_claim_result",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/worlds/${r.world_id}`,
      message: r.approved ? `hat die Rolle ${r.character_name} angenommen` : `hat das Angebot für ${r.character_name} abgelehnt`,
    });
  }
  refresh(r.world_id, r.character_id);
  return null;
}

export async function withdrawCharacterClaim(claimId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data: claim } = await supabase.from("character_claims").select("world_id, character_id").eq("id", claimId).maybeSingle<{ world_id: string; character_id: string }>();
  const { error } = await supabase.rpc("withdraw_character_claim", { p_claim: claimId });
  if (error) return error.message;
  refresh(claim?.world_id, claim?.character_id);
  return null;
}

// Eigenen Charakter an die Welt zurückgeben: er wird wieder eine freie Rolle
export async function releaseCharacter(characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("release_character", { p_character: characterId });
  if (error) return error.message;
  const r = data as { world_id: string; character_name: string };
  await notifyWorldAdmins(supabase, r.world_id, "leave", user.id, `hat den Charakter ${r.character_name} an die Welt zurückgegeben`, `/characters/${characterId}`);
  refresh(r.world_id, characterId);
  return null;
}

// Offene Welt: beitreten und die gewünschte Rolle gleich anfragen (aus der Vorschau)
export async function joinAndRequestRole(worldId: string, characterId: string, message: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: world } = await supabase.from("worlds").select("join_mode, created_by").eq("id", worldId).maybeSingle<{ join_mode: string; created_by: string }>();
  if (!world) return "Diese Welt gibt es nicht.";
  if (world.join_mode !== "open" && world.created_by !== user.id) return "Dieser Welt kannst du nicht direkt beitreten.";

  // Die Rolle muss in der Vorschau als frei geführt sein
  const { data: roles } = await supabase.rpc("world_preview_roles", { p_world: worldId });
  if (!((roles ?? []) as { id: string }[]).some((r) => r.id === characterId)) return "Diese Rolle ist nicht mehr frei.";

  const { data: existing } = await supabase.from("world_members").select("world_id").eq("world_id", worldId).eq("user_id", user.id).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("world_members").insert({ world_id: worldId, user_id: user.id });
    if (error) return error.message;
    await notifyWorldAdmins(supabase, worldId, "member_join", user.id, "ist der Welt beigetreten");
  }

  const err = await requestCharacter(characterId, message);
  if (err) return `Du bist der Welt beigetreten, aber die Anfrage klappte nicht: ${err}`;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, worldId, SELECTION_COOKIE_OPTIONS);
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  revalidatePath("/", "layout");
  return null;
}
