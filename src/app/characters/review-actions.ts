"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { notifyWorldAdmins } from "@/lib/world-admin-notify";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { getCharacterSheet } from "@/lib/character-sheet-data";
import { applyFieldChange, listCharacterFields, type ProfileFields } from "@/lib/character-fields";
import { saveCharacterSheet } from "./sheet-actions";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const PROFILE_COLUMNS = "name, bio, house, quote, status_text, gender, choices, world_id, owner_id";
type CharacterRow = ProfileFields & { world_id: string; owner_id: string };

async function actor(supabase: Supabase, userId: string) {
  const { data } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", userId).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  return { name: data?.nickname || data?.username || "Jemand", avatarUrl: data?.avatar_url ?? null };
}

function refresh(worldId: string, characterId: string) {
  revalidatePath(`/characters/${characterId}`);
  revalidatePath(`/characters/${characterId}/pruefung`);
  revalidatePath(`/characters/${characterId}/chabo`);
  revalidatePath(`/worlds/${worldId}`);
  revalidatePath(`/worlds/${worldId}/charaktere`);
  revalidatePath("/characters");
  revalidatePath("/", "layout");
}

async function me(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Admin genehmigt oder lehnt einen Charakter ab (mit Hinweis an die Besitzer:in)
export async function reviewCharacter(characterId: string, status: "approved" | "rejected", note: string): Promise<string | null> {
  const supabase = await createClient();
  const user = await me(supabase);
  if (!user) return "Nicht angemeldet.";
  const text = note.trim().slice(0, 500);
  if (status === "rejected" && !text) return "Bitte kurz sagen, was fehlt oder geändert werden soll.";
  // Ein genehmigter Charakter wird nicht mehr abgelehnt (Änderungen laufen über Vorschläge)
  if (status === "rejected") {
    const { data: current } = await supabase.from("characters").select("review_status").eq("id", characterId).maybeSingle<{ review_status: string | null }>();
    if (current?.review_status === "approved") return "Dieser Charakter ist schon genehmigt. Änderungen gehen über Vorschläge.";
  }
  const { data, error } = await supabase.rpc("review_character", { p_character: characterId, p_status: status, p_note: status === "rejected" ? text : text || null });
  if (error) return error.message;
  const r = data as { character_id: string; character_name: string; world_id: string; owner_id: string };
  if (r.owner_id !== user.id) {
    const who = await actor(supabase, user.id);
    await createNotification(supabase, {
      userId: r.owner_id,
      type: "character_review",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/characters/${r.character_id}/pruefung`,
      message: status === "approved" ? `hat ${r.character_name} genehmigt` : `hat ${r.character_name} abgelehnt: ${text}`,
    });
  }
  refresh(r.world_id, r.character_id);
  return null;
}

// Besitzer:in reicht einen abgelehnten Charakter erneut ein
export async function resubmitCharacter(characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const user = await me(supabase);
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("characters").update({ review_status: "pending" }).eq("id", characterId).eq("owner_id", user.id).eq("review_status", "rejected").select("id, name, world_id");
  if (error) return error.message;
  if (!data?.length) return "Dieser Charakter kann nicht erneut eingereicht werden.";
  await notifyWorldAdmins(supabase, data[0].world_id as string, "character_new", user.id, `hat ${data[0].name} erneut zur Prüfung eingereicht`, `/characters/${data[0].id}/pruefung`);
  refresh(data[0].world_id as string, characterId);
  return null;
}

// Admin schlägt zu einem Feld einen neuen Wert vor
export async function proposeCharacterChange(characterId: string, key: string, value: string, note: string): Promise<string | null> {
  const supabase = await createClient();
  const user = await me(supabase);
  if (!user) return "Nicht angemeldet.";
  const { data: c } = await supabase.from("characters").select(PROFILE_COLUMNS).eq("id", characterId).maybeSingle<CharacterRow>();
  if (!c) return "Charakter nicht gefunden.";
  const [lists, sheet] = await Promise.all([getWorldChoiceLists(c.world_id), getCharacterSheet(characterId, false)]);
  const field = listCharacterFields(c, lists, sheet).find((f) => f.key === key);
  if (!field) return "Dieses Feld gibt es nicht.";
  const check = applyFieldChange(key, value, c, lists, sheet);
  if (!check.ok) return check.error;
  if (value.trim() === field.value.trim()) return "Der Vorschlag ist gleich dem aktuellen Wert.";
  const { data, error } = await supabase.rpc("propose_character_change", { p_character: characterId, p_key: key, p_label: field.label, p_old: field.value, p_new: value.trim(), p_note: note.trim().slice(0, 500) });
  if (error) return error.message;
  const r = data as { character_id: string; character_name: string; world_id: string; owner_id: string };
  if (r.owner_id !== user.id) {
    const who = await actor(supabase, user.id);
    await createNotification(supabase, {
      userId: r.owner_id,
      type: "character_change",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/characters/${r.character_id}/pruefung`,
      message: `schlägt bei ${r.character_name} eine Änderung vor: ${field.label}`,
    });
  }
  refresh(r.world_id, r.character_id);
  return null;
}

// Besitzer:in übernimmt oder lehnt einen Vorschlag ab; Admins ziehen ihn zurück
export async function decideCharacterChange(proposalId: string, decision: "accepted" | "declined" | "withdrawn"): Promise<string | null> {
  const supabase = await createClient();
  const user = await me(supabase);
  if (!user) return "Nicht angemeldet.";

  if (decision === "accepted") {
    const { data: p } = await supabase.from("character_change_proposals").select("character_id, field_key, new_value, status").eq("id", proposalId).maybeSingle<{ character_id: string; field_key: string; new_value: string; status: string }>();
    if (!p || p.status !== "open") return "Dieser Vorschlag ist nicht mehr offen.";
    const { data: c } = await supabase.from("characters").select(PROFILE_COLUMNS).eq("id", p.character_id).eq("owner_id", user.id).maybeSingle<CharacterRow>();
    if (!c) return "Darüber entscheidet die Besitzer:in des Charakters.";
    const [lists, sheet] = await Promise.all([getWorldChoiceLists(c.world_id), getCharacterSheet(p.character_id, true)]);
    const applied = applyFieldChange(p.field_key, p.new_value, c, lists, sheet);
    if (!applied.ok) return applied.error;
    if (applied.profile) {
      const { error } = await supabase.from("characters").update(applied.profile).eq("id", p.character_id).eq("owner_id", user.id);
      if (error) return error.message;
    }
    if (applied.sheet) {
      const error = await saveCharacterSheet(p.character_id, applied.sheet);
      if (error) return error;
    }
  }

  const { data, error } = await supabase.rpc("decide_character_change", { p_proposal: proposalId, p_status: decision });
  if (error) return error.message;
  const r = data as { field_label: string; proposed_by: string | null; character_id: string; character_name: string; world_id: string; owner_id: string };
  if (decision !== "withdrawn" && r.proposed_by && r.proposed_by !== user.id) {
    const who = await actor(supabase, user.id);
    await createNotification(supabase, {
      userId: r.proposed_by,
      type: "character_change",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/characters/${r.character_id}/pruefung`,
      message: decision === "accepted" ? `hat deinen Vorschlag bei ${r.character_name} übernommen: ${r.field_label}` : `hat deinen Vorschlag bei ${r.character_name} abgelehnt: ${r.field_label}`,
    });
  }
  refresh(r.world_id, r.character_id);
  return null;
}
