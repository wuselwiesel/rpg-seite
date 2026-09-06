"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, ACTIVE_WORLD_COOKIE } from "@/lib/types";

export async function createWorld(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return "Bitte einen Namen für die Welt angeben.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: world, error } = await supabase
    .from("worlds")
    .insert({ name, description: description || null, created_by: user.id })
    .select("id")
    .single();

  if (error || !world) return error?.message ?? "Welt konnte nicht erstellt werden.";

  const { error: memberError } = await supabase
    .from("world_members")
    .insert({ world_id: world.id, user_id: user.id });

  if (memberError) return memberError.message;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, world.id, { path: "/", httpOnly: false, sameSite: "lax" });
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);

  revalidatePath("/", "layout");
  redirect("/characters/new?welcome=1");
}

export async function setActiveWorld(worldId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, worldId, { path: "/", httpOnly: false, sameSite: "lax" });
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addWorldMember(
  worldId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const friendUserId = String(formData.get("friend_user_id") ?? "");
  if (!friendUserId) return "Bitte eine Freundin oder einen Freund auswählen.";

  const supabase = await createClient();
  const { error } = await supabase
    .from("world_members")
    .insert({ world_id: worldId, user_id: friendUserId });

  if (error) return error.message;

  revalidatePath(`/worlds/${worldId}`);
  return null;
}

export async function updateWorld(
  worldId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const coverImageUrl = String(formData.get("cover_image_url") ?? "").trim();

  if (!name) return "Bitte einen Namen für die Welt angeben.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("worlds")
    .update({
      name,
      description: description || null,
      cover_image_url: coverImageUrl || null,
    })
    .eq("id", worldId)
    .eq("created_by", user.id);

  if (error) return error.message;

  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/worlds");
  revalidatePath("/", "layout");
  redirect(`/worlds/${worldId}`);
}

export async function followWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("world_follows").upsert({ world_id: worldId, user_id: user.id });
  revalidatePath("/search");
  revalidatePath("/");
}

export async function unfollowWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("world_follows").delete().eq("world_id", worldId).eq("user_id", user.id);
  revalidatePath("/search");
  revalidatePath("/");
}

export async function deleteWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("worlds").delete().eq("id", worldId).eq("created_by", user.id);

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WORLD_COOKIE)?.value === worldId) {
    cookieStore.delete(ACTIVE_WORLD_COOKIE);
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }

  revalidatePath("/", "layout");
  redirect("/worlds");
}

export async function leaveWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("world_members").delete().eq("world_id", worldId).eq("user_id", user.id);

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WORLD_COOKIE)?.value === worldId) {
    cookieStore.delete(ACTIVE_WORLD_COOKIE);
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }

  revalidatePath("/", "layout");
  redirect("/worlds");
}
