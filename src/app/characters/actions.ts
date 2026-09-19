"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";

const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

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
      avatar_url: avatarUrl || null,
      sheet_url: sheetUrl || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return error ? usernameErrorMessage(error.message) : "Charakter konnte nicht erstellt werden.";
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHARACTER_COOKIE, data.id, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

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

  if (name.length < 1) {
    return "Bitte einen Namen für den Charakter angeben.";
  }
  const username = parseUsername(formData.get("username"));
  if (username.error) return username.error;
  const themeFont = String(formData.get("theme_font") ?? "").trim();
  const themeAccent = String(formData.get("theme_accent") ?? "").trim();
  const themeBg = String(formData.get("theme_bg") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("characters")
    .update({
      name,
      ...(username.value ? { username: username.value } : {}),
      theme_font: themeFont || null,
      theme_accent: themeAccent || null,
      theme_bg: themeBg || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      sheet_url: sheetUrl || null,
    })
    .eq("id", characterId)
    .eq("owner_id", user.id);

  if (error) return usernameErrorMessage(error.message);

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
  cookieStore.set(ACTIVE_CHARACTER_COOKIE, characterId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function createRelationship(_prevState: string | null, formData: FormData) {
  const characterAId = String(formData.get("character_a_id") ?? "");
  const characterBId = String(formData.get("character_b_id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

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
