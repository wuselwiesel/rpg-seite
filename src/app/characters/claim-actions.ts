"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { notifyWorldAdmins } from "@/lib/world-admin-notify";

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

// Eine Rolle (NPC) zur Vergabe freigeben oder wieder zurücknehmen: Anleger:in und alle Admins der Welt
export async function setCharacterClaimable(characterId: string, claimable: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("characters").update({ claimable }).eq("id", characterId).eq("is_npc", true).select("id, world_id");
  if (error) return error.message;
  if (!data?.length) return "Nur NPCs lassen sich zur Vergabe freigeben, und nur Admins oder die Person, die sie angelegt hat.";
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
  const r = data as { world_id: string; character_name: string };
  await notifyWorldAdmins(supabase, r.world_id, "role_request", user.id, `möchte die Rolle ${r.character_name} übernehmen`, `/worlds/${r.world_id}`);
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
