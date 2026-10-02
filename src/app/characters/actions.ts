"use server";

import { cleanNameSymbol } from "@/lib/name-symbol";
import { parseProfileFields } from "@/lib/profile-fields";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, SELECTION_COOKIE_OPTIONS } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";

const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const GENDERS = ["maennlich", "weiblich", "divers"] as const;
const SPECIES = ["mensch", "vampir", "werwolf"] as const;
const RELATIONSHIP_STATUSES = ["single", "beziehung", "kompliziert", "verheiratet"] as const;

function parseRelationshipStatus(raw: FormDataEntryValue | null): (typeof RELATIONSHIP_STATUSES)[number] | null {
  const value = String(raw ?? "");
  return (RELATIONSHIP_STATUSES as readonly string[]).includes(value)
    ? (value as (typeof RELATIONSHIP_STATUSES)[number])
    : null;
}

function parseGender(raw: FormDataEntryValue | null): (typeof GENDERS)[number] | null {
  const value = String(raw ?? "");
  return (GENDERS as readonly string[]).includes(value) ? (value as (typeof GENDERS)[number]) : null;
}

function parseSpecies(raw: FormDataEntryValue | null): (typeof SPECIES)[number] {
  const value = String(raw ?? "");
  return (SPECIES as readonly string[]).includes(value) ? (value as (typeof SPECIES)[number]) : "mensch";
}

function parseUsername(raw: FormDataEntryValue | null): { value: string | null; error?: string } {
  const value = String(raw ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!value) return { value: null };
  if (!USERNAME_PATTERN.test(value)) {
    return { value: null, error: "Nutzername: 3-30 Zeichen, nur Buchstaben, Zahlen, Punkt und Unterstrich." };
  }
  return { value };
}

function usernameErrorMessage(message: string): string {
  if (message.includes("characters_username_unique_idx")) return "Dieser Nutzername ist schon vergeben.";
  if (message.includes("username")) return "Nutzernamen sind noch nicht eingerichtet (Datenbank-Migration fehlt).";
  return message;
}

export async function createCharacter(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const sheetUrl = String(formData.get("sheet_url") ?? "").trim();
  const house = String(formData.get("house") ?? "").trim().slice(0, 60);
  const gender = parseGender(formData.get("gender"));
  const species = parseSpecies(formData.get("species"));

  if (name.length < 1) {
    return "Bitte einen Namen für den Charakter angeben.";
  }
  const username = parseUsername(formData.get("username"));
  if (username.error) return username.error;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "Nicht angemeldet.";
  }

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) {
    return "Keine aktive Welt ausgewählt.";
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({
      owner_id: user.id,
      world_id: activeWorld.id,
      name,
      ...(username.value ? { username: username.value } : {}),
      bio: bio || null,
      house: house || null,
      gender,
      species,
      avatar_url: avatarUrl || null,
      sheet_url: sheetUrl || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return error ? usernameErrorMessage(error.message) : "Charakter konnte nicht erstellt werden.";
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHARACTER_COOKIE, data.id, SELECTION_COOKIE_OPTIONS);

  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateCharacter(
  characterId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const sheetUrl = String(formData.get("sheet_url") ?? "").trim();
  const house = String(formData.get("house") ?? "").trim().slice(0, 60);
  const gender = parseGender(formData.get("gender"));
  const species = parseSpecies(formData.get("species"));
  const relationshipStatus = parseRelationshipStatus(formData.get("relationship_status"));
  const partnerCharacterId = String(formData.get("partner_character_id") ?? "").trim() || null;
  const bestFriendCharacterId = String(formData.get("best_friend_character_id") ?? "").trim() || null;

  if (name.length < 1) {
    return "Bitte einen Namen für den Charakter angeben.";
  }
  if (partnerCharacterId === characterId || bestFriendCharacterId === characterId) {
    return "Ein Charakter kann nicht die eigene Partnerin/der eigene beste Freund sein.";
  }
  const username = parseUsername(formData.get("username"));
  if (username.error) return username.error;
  const themeFont = String(formData.get("theme_font") ?? "").trim();
  const themeAccent = String(formData.get("theme_accent") ?? "").trim();
  const themeBg = String(formData.get("theme_bg") ?? "").trim();
  const statusText = String(formData.get("status_text") ?? "").trim().slice(0, 80);
  const customFields = parseProfileFields(formData);
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/`;
  const bannerRaw = String(formData.get("banner_url") ?? "").trim();
  const bannerUrl = bannerRaw.startsWith(storage) ? bannerRaw : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nicht angemeldet.";

  // Partner:in / beste:r Freund:in müssen echte, für die Person erreichbare Charaktere sein
  // (Welt-Mitglied), sonst still auf "keine Angabe" zurückfallen statt einen Fehler zu werfen.
  const { data: own } = await supabase.from("characters").select("world_id").eq("id", characterId).maybeSingle();
  let validPartnerId = partnerCharacterId;
  let validBestFriendId = bestFriendCharacterId;
  if (own && (partnerCharacterId || bestFriendCharacterId)) {
    const idsToCheck = [partnerCharacterId, bestFriendCharacterId].filter((v): v is string => !!v);
    const { data: candidates } = await supabase.from("characters").select("id, world_id").in("id", idsToCheck);
    const validIds = new Set((candidates ?? []).filter((c) => c.world_id === own.world_id).map((c) => c.id));
    if (partnerCharacterId && !validIds.has(partnerCharacterId)) validPartnerId = null;
    if (bestFriendCharacterId && !validIds.has(bestFriendCharacterId)) validBestFriendId = null;
  }

  const { error } = await supabase
    .from("characters")
    .update({
      name,
      ...(username.value ? { username: username.value } : {}),
      theme_font: themeFont || null,
      theme_accent: themeAccent || null,
      theme_bg: themeBg || null,
      bio: bio || null,
      status_text: statusText || null,
      banner_url: bannerUrl,
      custom_fields: customFields,
      house: house || null,
      gender,
      species,
      relationship_status: relationshipStatus,
      partner_character_id: relationshipStatus && relationshipStatus !== "single" ? validPartnerId : null,
      best_friend_character_id: validBestFriendId,
      avatar_url: avatarUrl || null,
      sheet_url: sheetUrl || null,
    })
    .eq("id", characterId)
    .eq("owner_id", user.id);

  if (error) return usernameErrorMessage(error.message);

  // Zeichen neben dem Namen separat speichern, damit alles andere auch ohne die zugehörige Spalte gespeichert wird.
  const { error: symbolError } = await supabase
    .from("characters")
    .update({ name_symbol: cleanNameSymbol(String(formData.get("name_symbol") ?? "")) || null })
    .eq("id", characterId)
    .eq("owner_id", user.id);
  if (symbolError && /name_symbol/.test(symbolError.message) && cleanNameSymbol(String(formData.get("name_symbol") ?? ""))) {
    return "Gespeichert, aber das Zeichen neben dem Namen nicht: Die Datenbank-Spalte name_symbol fehlt noch (supabase/migration_name_symbol.sql).";
  }

  revalidatePath("/", "layout");
  redirect(`/characters/${characterId}`);
}

export async function deleteCharacter(characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("characters")
    .delete({ count: "exact" })
    .eq("id", characterId)
    .eq("owner_id", user.id);

  if (error) return error.message;
  if (!count) return "Charakter konnte nicht gelöscht werden. Bitte später erneut versuchen.";

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value === characterId) {
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }

  revalidatePath("/", "layout");
  redirect("/characters");
}

export async function setActiveCharacter(characterId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHARACTER_COOKIE, characterId, SELECTION_COOKIE_OPTIONS);
  revalidatePath("/", "layout");
}

const CATEGORIES = ["familie", "liebe", "freundschaft", "buendnis", "rivalitaet", "sonstiges"] as const;
const FAMILY_ROLES = ["eltern", "partner", "geschwister", "verwandt"] as const;

function parseCategory(raw: FormDataEntryValue | null): (typeof CATEGORIES)[number] {
  const value = String(raw ?? "");
  return (CATEGORIES as readonly string[]).includes(value) ? (value as (typeof CATEGORIES)[number]) : "sonstiges";
}

function parseFamilyRole(raw: FormDataEntryValue | null): (typeof FAMILY_ROLES)[number] {
  const value = String(raw ?? "");
  return (FAMILY_ROLES as readonly string[]).includes(value) ? (value as (typeof FAMILY_ROLES)[number]) : "verwandt";
}

// Leeres Feld = null (dann zählt der Tag des Anlegens); sonst ein Datum JJJJ-MM-TT; false = ungültig.
function parseDate(raw: FormDataEntryValue | null): string | null | false {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return false;
  return v;
}

// Datum und Notiz eines vorhandenen Verlaufsschritts nachträglich ändern.
export async function updateRelationshipStep(stepId: string, since: string, note: string): Promise<string | null> {
  const date = parseDate(since);
  if (date === false) return "Ungültiges Datum.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("update_relationship_step", {
    p_step_id: stepId,
    p_occurred_on: date,
    p_note: note.trim().slice(0, 300),
  });
  if (error) return error.message;
  revalidatePath("/characters/relationships");
  return null;
}

// Beziehung entwickelt sich weiter ("Feinde -> Verbündete"): der Verlauf entsteht automatisch per Trigger.
export async function updateRelationship(
  relationshipId: string,
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const type = String(formData.get("type") ?? "").trim().slice(0, 60);
  const color = String(formData.get("color") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const since = parseDate(formData.get("since"));
  if (since === false) return "Ungültiges Datum.";
  const category = parseCategory(formData.get("category"));
  const familyRole = category === "familie" ? parseFamilyRole(formData.get("family_role")) : null;
  if (!type) return "Bitte eine Bezeichnung angeben.";
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return "Ungültige Farbe.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("character_relationships")
    .update(
      { type, color, label: label || null, category, family_role: familyRole, change_note: note || null, change_date: since },
      { count: "exact" },
    )
    .eq("id", relationshipId);
  if (error) return error.message;
  if (!count) return "Keine Berechtigung, diese Beziehung zu ändern.";

  revalidatePath("/characters/relationships");
  return null;
}

export async function createRelationship(_prevState: string | null, formData: FormData) {
  const characterAId = String(formData.get("character_a_id") ?? "");
  const characterBId = String(formData.get("character_b_id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const since = parseDate(formData.get("since"));
  const category = parseCategory(formData.get("category"));
  const familyRole = category === "familie" ? parseFamilyRole(formData.get("family_role")) : null;

  if (since === false) return "Ungültiges Datum.";
  if (!characterAId || !characterBId) return "Bitte zwei Charaktere auswählen.";
  if (characterAId === characterBId) return "Wähle zwei unterschiedliche Charaktere.";
  if (!type) return "Bitte eine Bezeichnung angeben.";
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return "Ungültige Farbe.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: character } = await supabase
    .from("characters")
    .select("world_id")
    .eq("id", characterAId)
    .maybeSingle();
  if (!character) return "Charakter nicht gefunden.";

  const { error } = await supabase.from("character_relationships").insert({
    world_id: character.world_id,
    character_a_id: characterAId,
    character_b_id: characterBId,
    type,
    color,
    label: label || null,
    category,
    family_role: familyRole,
    change_date: since,
    created_by: user.id,
  });

  if (error) return error.message;

  revalidatePath("/characters/relationships");
  return null;
}

export async function deleteRelationship(relationshipId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("character_relationships")
    .delete({ count: "exact" })
    .eq("id", relationshipId);

  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";

  revalidatePath("/characters/relationships");
  return null;
}

export async function toggleFollowCharacter(
  followerId: string,
  followedId: string,
  follow: boolean,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  if (followerId === followedId) return "Du kannst dir nicht selbst folgen.";

  const { error } = follow
    ? await supabase.from("character_follows").insert({ follower_id: followerId, followed_id: followedId })
    : await supabase
        .from("character_follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("followed_id", followedId);

  if (error && error.code !== "23505") return error.message;

  revalidatePath(`/characters/${followedId}`);
  return null;
}
