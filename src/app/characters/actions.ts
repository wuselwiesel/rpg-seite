"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";

export async function createCharacter(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const sheetUrl = String(formData.get("sheet_url") ?? "").trim();

  if (name.length < 1) {
    return "Bitte einen Namen für den Charakter angeben.";
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

  const { data, error } = await supabase
    .from("characters")
    .insert({
      owner_id: user.id,
      world_id: activeWorld.id,
      name,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      sheet_url: sheetUrl || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return error?.message ?? "Charakter konnte nicht erstellt werden.";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("characters")
    .update({ name, bio: bio || null, avatar_url: avatarUrl || null, sheet_url: sheetUrl || null })
    .eq("id", characterId)
    .eq("owner_id", user.id);

  if (error) return error.message;

  revalidatePath("/", "layout");
  redirect(`/characters/${characterId}`);
}

export async function deleteCharacter(characterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("characters").delete().eq("id", characterId).eq("owner_id", user.id);

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
