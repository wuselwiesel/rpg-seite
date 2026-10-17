"use server";

import { cleanNameSymbol } from "@/lib/name-symbol";
import { parseProfileFields } from "@/lib/profile-fields";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, SELECTION_COOKIE_OPTIONS } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { hasErrors, normalizeSheet, validateSheet, withDerived, type SheetData } from "@/lib/sheet-rules";
import { getCharacterAccess } from "@/lib/npc-data";
import { parseTalentConfig } from "@/lib/talents";
import { DEFAULT_NATURES, parseNatureConfig } from "@/lib/natures";
import { createNotification } from "@/lib/notifications";
import { getChoiceUsage, getWorldChoiceLists } from "@/lib/choice-lists-data";
import { activeLists, limitError, parseChoices, speciesFromLabel } from "@/lib/choice-lists";
import { SECRETS_NOT_ALLOWED, worldAllowsSecrets } from "@/lib/world-secrets";
import { newlyFullEntries } from "@/lib/world-admin-events";
import { notifyFullEntries, notifyWorldAdmins } from "@/lib/world-admin-notify";

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
  const quote = String(formData.get("quote") ?? "").trim().slice(0, 200);
  const gender = parseGender(formData.get("gender"));
  // „Frei“: normaler Charakter (kein NPC) ohne Spieler:in, zur Vergabe freigegeben; „NPC“ ist davon unabhängig
  const isNpc = formData.get("is_npc") === "on";
  const free = !isNpc && formData.get("free") === "on";

  if (name.length < 1) {
    return "Bitte einen Namen für den Charakter angeben.";
  }
  const username = parseUsername(formData.get("username"));
  if (username.error) return username.error;

  // Gewürfelter Bogen (Komplett würfeln): wird vor dem Anlegen geprüft und danach mit dem Charakter gespeichert
  let sheetParsed: unknown = null;
  const sheetRaw = String(formData.get("sheet_json") ?? "").trim();
  if (sheetRaw) {
    try {
      sheetParsed = JSON.parse(sheetRaw);
    } catch {
      return "Der gewürfelte Bogen ist ungültig.";
    }
  }

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

  // Auswahllisten der Welt: gewählte Werte; ersetzt die Liste „Wesen“ die feste Auswahl, folgt die Natur ihrem Wert
  const choiceLists = await getWorldChoiceLists(activeWorld.id);
  const choices = parseChoices((k) => (formData.has(k) ? String(formData.get(k)) : null), choiceLists);
  // Höchstzahl je Eintrag (z. B. höchstens 2 Vampire in der Welt)
  const createUsage = await getChoiceUsage(activeWorld.id);
  const createLimit = limitError(choiceLists, choices, createUsage);
  if (createLimit) return createLimit;
  const speciesList = activeLists(choiceLists).find((l) => l.isSpecies);
  const species = speciesList ? speciesFromLabel(choices[speciesList.id]) : parseSpecies(formData.get("species"));

  // Die Talentliste der Welt gilt auch für den gewürfelten Bogen
  let sheet: SheetData | null = null;
  if (sheetParsed) {
    const { data: worldRow } = await supabase.from("worlds").select("talent_config, nature_config").eq("id", activeWorld.id).maybeSingle<{ talent_config: unknown; nature_config: unknown }>();
    const defs = worldRow?.talent_config ? parseTalentConfig(worldRow.talent_config) : undefined;
    const natures = worldRow?.nature_config != null ? parseNatureConfig(worldRow.nature_config) : DEFAULT_NATURES;
    sheet = normalizeSheet(sheetParsed, defs, natures);
    const errors = validateSheet(sheet);
    if (hasErrors(errors)) return errors.budget[0] ?? "Der gewürfelte Bogen ist ungültig.";
    sheet = withDerived({ ...sheet, notesBlocks: sheet.notesBlocks.map((b) => ({ label: b.label, html: sanitizePostHtml(b.html) })) });
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
      quote: quote || null,
      gender,
      species,
      choices,
      avatar_url: avatarUrl || null,
      ...(sheetUrl ? { sheet_url: sheetUrl } : {}),
      is_npc: isNpc,
      vacant: free,
      claimable: free,
    })
    .select("id, review_status")
    .single<{ id: string; review_status: string }>();

  if (error || !data) {
    return error ? usernameErrorMessage(error.message) : "Charakter konnte nicht erstellt werden.";
  }

  if (sheet) {
    // Die Talentliste der Welt gehört nicht in den gespeicherten Bogen
    const { talentDefs: _defs, natureDefs: _natures, ...stored } = sheet;
    void _defs;
    void _natures;
    const { error: sheetError } = await supabase.from("character_sheets").insert({ character_id: data.id, data: stored });
    if (sheetError) {
      // Lieber nichts anlegen als einen Charakter ohne den gewürfelten Bogen: wieder entfernen
      await supabase.from("characters").delete().eq("id", data.id);
      return `Der Bogen konnte nicht gespeichert werden: ${sheetError.message}`;
    }
  }

  // Admins der Welt erfahren von neuen Charakteren und NPCs und davon, dass ein Eintrag seine Höchstzahl erreicht hat
  await notifyWorldAdmins(supabase, activeWorld.id, isNpc ? "npc_new" : "character_new", user.id, `hat ${isNpc ? "einen neuen NPC" : free ? "einen freien Charakter" : "einen neuen Charakter"} erstellt: ${name}${data.review_status === "pending" ? " (zur Prüfung)" : ""}`, data.review_status === "pending" ? `/characters/${data.id}/pruefung` : `/characters/${data.id}`);
  await notifyFullEntries(supabase, activeWorld.id, user.id, newlyFullEntries(choiceLists, choices, createUsage));

  revalidatePath("/", "layout");
  // Ein NPC oder freier Charakter wird nicht zum aktiven Charakter (keine:n Spieler:in); man landet im ChaBo
  if (isNpc || free) redirect(`/characters/${data.id}/chabo`);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHARACTER_COOKIE, data.id, SELECTION_COOKIE_OPTIONS);
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
  const quote = String(formData.get("quote") ?? "").trim().slice(0, 200);
  const gender = parseGender(formData.get("gender"));
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

  // Wer darf bearbeiten? Besitzer:in, bei NPCs auch die Welt-Besitzerin (die Datenbank erzwingt dasselbe).
  const { data: own } = await supabase
    .from("characters")
    .select("world_id, owner_id, is_npc, choices")
    .eq("id", characterId)
    .maybeSingle<{ world_id: string; owner_id: string; is_npc: boolean; choices: Record<string, string> | null }>();
  if (!own) return "Charakter nicht gefunden.";
  if (!(await getCharacterAccess(own, user.id)).canEdit) return "Nur die Besitzer:in kann diesen Charakter bearbeiten.";

  // Auswahllisten: aktive Listen übernehmen den Formularwert (leer = löschen), stillgelegte behalten ihren Wert
  const choiceLists = await getWorldChoiceLists(own.world_id);
  const submitted = parseChoices((k) => (formData.has(k) ? String(formData.get(k)) : null), choiceLists);
  const choices: Record<string, string> = { ...(own.choices ?? {}) };
  for (const list of activeLists(choiceLists)) {
    if (!formData.has(`choice_${list.id}`)) continue;
    if (submitted[list.id]) choices[list.id] = submitted[list.id];
    else delete choices[list.id];
  }
  // Höchstzahl je Eintrag: Behält der Charakter seinen Eintrag, zählt er nicht gegen die Grenze
  const updateUsage = await getChoiceUsage(own.world_id);
  const updateLimit = limitError(choiceLists, choices, updateUsage, (own.choices ?? {}) as Record<string, string>);
  if (updateLimit) return updateLimit;
  const speciesList = activeLists(choiceLists).find((l) => l.isSpecies);
  const species = speciesList ? speciesFromLabel(choices[speciesList.id]) : parseSpecies(formData.get("species"));

  // Partner:in / beste:r Freund:in müssen echte, für die Person erreichbare Charaktere sein
  // (Welt-Mitglied), sonst still auf "keine Angabe" zurückfallen statt einen Fehler zu werfen.
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
      ...(formData.has("quote") ? { quote: quote || null } : {}),
      gender,
      species,
      choices,
      relationship_status: relationshipStatus,
      partner_character_id: relationshipStatus && relationshipStatus !== "single" ? validPartnerId : null,
      best_friend_character_id: validBestFriendId,
      avatar_url: avatarUrl || null,
      // Der Link zum alten Charakterbogen steht nicht mehr im Formular; ein vorhandener bleibt unangetastet
      ...(formData.has("sheet_url") ? { sheet_url: sheetUrl || null } : {}),
    })
    .eq("id", characterId);

  if (error) return usernameErrorMessage(error.message);

  // Zeichen neben dem Namen separat speichern, damit alles andere auch ohne die zugehörige Spalte gespeichert wird.
  const { error: symbolError } = await supabase
    .from("characters")
    .update({ name_symbol: cleanNameSymbol(String(formData.get("name_symbol") ?? "")) || null })
    .eq("id", characterId);
  if (symbolError && /name_symbol/.test(symbolError.message) && cleanNameSymbol(String(formData.get("name_symbol") ?? ""))) {
    return "Gespeichert, aber das Zeichen neben dem Namen nicht: Die Datenbank-Spalte name_symbol fehlt noch (supabase/migration_name_symbol.sql).";
  }

  await notifyFullEntries(supabase, own.world_id, user.id, newlyFullEntries(choiceLists, choices, updateUsage, (own.choices ?? {}) as Record<string, string>));

  revalidatePath("/", "layout");
  redirect(`/characters/${characterId}`);
}

export async function deleteCharacter(characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: target } = await supabase.from("characters").select("owner_id, is_npc, world_id, name").eq("id", characterId).maybeSingle<{ owner_id: string; is_npc: boolean; world_id: string; name: string }>();
  if (!target) return "Charakter konnte nicht gelöscht werden. Bitte später erneut versuchen.";
  if (!(await getCharacterAccess(target, user.id)).canEdit) return "Nur die Besitzer:in kann diesen Charakter löschen.";

  // Nur ausblenden, nicht löschen: Beiträge, Nachrichten und Story-Einträge bleiben erhalten.
  const { error, count } = await supabase
    .from("characters")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", characterId)
    .is("deleted_at", null);

  if (error) return error.message;
  if (!count) return "Charakter konnte nicht gelöscht werden. Bitte später erneut versuchen.";

  await notifyWorldAdmins(supabase, target.world_id, "leave", user.id, `hat ${target.is_npc ? "den NPC" : "den Charakter"} ${target.name} gelöscht`);

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value === characterId) {
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }

  revalidatePath("/", "layout");
  redirect("/characters");
}

// Einen bereits gelöschten (ausgeblendeten) Charakter endgültig entfernen – mit allem, was an ihm hängt.
export async function purgeCharacter(characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: target } = await supabase
    .from("characters")
    .select("owner_id, is_npc, world_id, deleted_at")
    .eq("id", characterId)
    .maybeSingle<{ owner_id: string; is_npc: boolean; world_id: string; deleted_at: string | null }>();
  if (!target) return "Charakter nicht gefunden.";
  if (!target.deleted_at) return "Der Charakter muss zuerst gelöscht werden.";
  if (!(await getCharacterAccess(target, user.id)).canEdit) return "Nur die Besitzer:in kann diesen Charakter endgültig löschen.";

  const { error, count } = await supabase.from("characters").delete({ count: "exact" }).eq("id", characterId).not("deleted_at", "is", null);
  if (error) return error.message;
  if (!count) return "Charakter konnte nicht gelöscht werden.";

  revalidatePath("/", "layout");
  return null;
}

export async function restoreCharacter(characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: target } = await supabase.from("characters").select("owner_id, is_npc, world_id").eq("id", characterId).maybeSingle<{ owner_id: string; is_npc: boolean; world_id: string }>();
  if (!target) return "Charakter nicht gefunden.";
  if (!(await getCharacterAccess(target, user.id)).canEdit) return "Nur die Besitzer:in kann diesen Charakter wiederherstellen.";

  const { error, count } = await supabase.from("characters").update({ deleted_at: null }, { count: "exact" }).eq("id", characterId);
  if (error) return error.message;
  if (!count) return "Charakter konnte nicht wiederhergestellt werden.";

  revalidatePath("/", "layout");
  return null;
}

// Charakter in einen NPC umwandeln und zurück: nur die Person, die ihn angelegt hat (die Datenbank sichert das zusätzlich per Trigger).
export async function setCharacterNpc(characterId: string, isNpc: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("characters").update({ is_npc: isNpc }).eq("id", characterId).eq("owner_id", user.id).select("id, world_id, name");
  if (error) return error.message;
  if (!data?.length) return "Nur die Person, die den Charakter angelegt hat, kann ihn umwandeln.";
  if (isNpc) await notifyWorldAdmins(supabase, data[0].world_id as string, "npc_new", user.id, `hat ${data[0].name} zum NPC gemacht`, `/characters/${characterId}`);
  // Ein NPC ist kein aktiver Charakter mehr
  if (isNpc) {
    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value === characterId) cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }
  revalidatePath("/", "layout");
  return null;
}

export async function setActiveCharacter(characterId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHARACTER_COOKIE, characterId, SELECTION_COOKIE_OPTIONS);
  revalidatePath("/", "layout");
}

const CATEGORIES = ["familie", "liebe", "freundschaft", "buendnis", "rivalitaet", "sonstiges"] as const;
const FAMILY_ROLES = ["eltern", "partner", "geschwister", "verwandt", "halbgeschwister", "adoptiv"] as const;

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
  const typeB = String(formData.get("type_b") ?? "").trim().slice(0, 60);
  const color = String(formData.get("color") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const since = parseDate(formData.get("since"));
  if (since === false) return "Ungültiges Datum.";
  let endedOn = parseDate(formData.get("ended_on"));
  if (endedOn === false) return "Ungültiges Datum.";
  const endedLabel = String(formData.get("ended_label") ?? "").trim().slice(0, 40);
  // „Beendet“ ohne Datum gilt ab heute
  if (formData.get("ended") === "on" && !endedOn) endedOn = new Date().toISOString().slice(0, 10);
  if (formData.get("ended") !== "on") endedOn = null;
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
      {
        type,
        type_b: typeB || null,
        color,
        label: label || null,
        category,
        family_role: familyRole,
        change_note: note || null,
        change_date: since,
        ended_on: endedOn,
        ended_label: endedLabel || null,
      },
      { count: "exact" },
    )
    .eq("id", relationshipId);
  if (error) return error.message;
  if (!count) return "Keine Berechtigung, diese Beziehung zu ändern.";

  // Die ChaBo-Zeilen beider Figuren folgen der Änderung (ein Fehler hier darf das Speichern nicht verhindern)
  await supabase.rpc("sync_relationship_sheets", { p_rel: relationshipId });
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
  const typeB = String(formData.get("type_b") ?? "").trim().slice(0, 60);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const isSecret = formData.get("is_secret") === "on";
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
  if (isSecret && !(await worldAllowsSecrets(character.world_id))) return SECRETS_NOT_ALLOWED;

  const { data: created, error } = await supabase.from("character_relationships").insert({
    world_id: character.world_id,
    character_a_id: characterAId,
    character_b_id: characterBId,
    type,
    type_b: typeB || null,
    color,
    label: label || null,
    category,
    family_role: familyRole,
    is_secret: isSecret,
    ended_on: formData.get("ended") === "on" ? (parseDate(formData.get("ended_on")) || new Date().toISOString().slice(0, 10)) : null,
    ended_label: formData.get("ended") === "on" ? String(formData.get("ended_label") ?? "").trim().slice(0, 40) || null : null,
    change_date: since,
    change_note: note || null,
    created_by: user.id,
  }).select("id").single<{ id: string }>();

  if (error) return error.message;
  if (created) {
    // In die ChaBo-Zeilen beider Figuren übernehmen (geheime Beziehungen bleiben im Netz)
    await supabase.rpc("sync_relationship_sheets", { p_rel: created.id });
    if (!isSecret) await notifyRelationshipOwners(supabase, user.id, created.id, characterAId, characterBId, type);
  }

  revalidatePath("/characters/relationships");
  return null;
}

export async function deleteRelationship(relationshipId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: edge } = await supabase
    .from("character_relationships")
    .select("character_a_id, character_b_id")
    .eq("id", relationshipId)
    .maybeSingle<{ character_a_id: string; character_b_id: string }>();

  const { error, count } = await supabase
    .from("character_relationships")
    .delete({ count: "exact" })
    .eq("id", relationshipId);

  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";
  // Auch aus den ChaBo-Zeilen beider Figuren nehmen
  if (edge) await supabase.rpc("unlink_relationship_sheets", { p_rel: relationshipId, p_a: edge.character_a_id, p_b: edge.character_b_id });

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


// Besitzer:innen der beteiligten Charaktere (außer dem Eintragenden) erfahren von der neuen Beziehung.
async function notifyRelationshipOwners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  relationshipId: string,
  aId: string,
  bId: string,
  type: string,
) {
  try {
    const { data: chars } = await supabase.from("characters").select("id, name, owner_id").in("id", [aId, bId]).returns<{ id: string; name: string; owner_id: string }[]>();
    const { data: me } = await supabase.from("profiles").select("username, avatar_url").eq("id", userId).maybeSingle<{ username: string; avatar_url: string | null }>();
    if (!chars || chars.length < 2) return;
    for (const c of chars) {
      if (c.owner_id === userId) continue;
      const other = chars.find((x) => x.id !== c.id);
      await createNotification(supabase, {
        userId: c.owner_id,
        type: "relationship",
        actorName: me?.username ?? "Jemand",
        actorAvatarUrl: me?.avatar_url ?? null,
        link: `/characters/relationships?fokus=${c.id}&beziehung=${relationshipId}`,
        message: `hat „${type}“ zwischen ${c.name} und ${other?.name ?? "einer Figur"} eingetragen`,
        recipientName: c.name,
      });
    }
  } catch {
    // Benachrichtigungen sind nachrangig
  }
}

export type SharedScene = { id: string; title: string; created_at: string };

// Szenen, in denen beide Charaktere geschrieben haben oder der eine den anderen erwähnt wurde.
export async function getSharedScenes(aId: string, bId: string): Promise<SharedScene[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const idRe = /^[0-9a-f-]{36}$/i;
  if (!idRe.test(aId) || !idRe.test(bId)) return [];

  const [{ data: written }, { data: mentionA }, { data: mentionB }] = await Promise.all([
    supabase.from("story_entries").select("story_post_id, character_id").in("character_id", [aId, bId]).limit(2000),
    supabase.from("story_entries").select("story_post_id").ilike("content", `%data-id="${aId}"%`).limit(500),
    supabase.from("story_entries").select("story_post_id").ilike("content", `%data-id="${bId}"%`).limit(500),
  ]);
  const writers = new Map<string, Set<string>>();
  for (const r of written ?? []) {
    const set = writers.get(r.story_post_id as string) ?? new Set<string>();
    set.add(r.character_id as string);
    writers.set(r.story_post_id as string, set);
  }
  const mentionedA = new Set((mentionA ?? []).map((r) => r.story_post_id as string));
  const mentionedB = new Set((mentionB ?? []).map((r) => r.story_post_id as string));
  const ids: string[] = [];
  for (const [postId, set] of writers) {
    const both = set.has(aId) && set.has(bId);
    const aWroteBMentioned = set.has(aId) && mentionedB.has(postId);
    const bWroteAMentioned = set.has(bId) && mentionedA.has(postId);
    if (both || aWroteBMentioned || bWroteAMentioned) ids.push(postId);
  }
  if (ids.length === 0) return [];
  const { data: posts } = await supabase
    .from("story_posts")
    .select("id, title, created_at")
    .in("id", ids.slice(0, 60))
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<SharedScene[]>();
  return posts ?? [];
}

// Widerspruch zwischen ChaBo-Zeile und Beziehungsnetz auflösen: „netz“ schreibt die Bezeichnung des Netzes in den ChaBo,
// „chabo“ übernimmt die Bezeichnung des ChaBo ins Netz.
export async function resolveRelationshipConflict(relationshipId: string, characterId: string, use: "netz" | "chabo"): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data: edge } = await supabase
    .from("character_relationships")
    .select("character_a_id, character_b_id, type, type_b, family_role")
    .eq("id", relationshipId)
    .maybeSingle<{ character_a_id: string; character_b_id: string; type: string; type_b: string | null; family_role: string | null }>();
  if (!edge) return "Beziehung nicht gefunden.";

  if (use === "netz") {
    const { error } = await supabase.rpc("sync_relationship_sheets", { p_rel: relationshipId });
    if (error) return error.message;
  } else {
    const { data: sheet } = await supabase.from("character_sheets").select("data").eq("character_id", characterId).maybeSingle<{ data: { family?: { label?: string; relId?: string }[] } }>();
    const row = sheet?.data?.family?.find((r) => r.relId === relationshipId);
    const label = String(row?.label ?? "").trim().slice(0, 60);
    if (!label) return "Im ChaBo steht keine Bezeichnung.";
    const isA = edge.character_a_id === characterId;
    const { error, count } = await supabase
      .from("character_relationships")
      .update(isA ? { type: label } : { type_b: label }, { count: "exact" })
      .eq("id", relationshipId);
    if (error) return error.message;
    if (!count) return "Keine Berechtigung, diese Beziehung zu ändern.";
    await supabase.rpc("sync_relationship_sheets", { p_rel: relationshipId, p_skip: characterId });
  }
  revalidatePath("/characters/relationships");
  return null;
}
