"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function actor(supabase: Supabase, userId: string) {
  const { data } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", userId).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  return { name: data?.nickname || data?.username || "Jemand", avatarUrl: data?.avatar_url ?? null };
}

// Beitritt anfragen (Welten mit „Auf Anfrage“): die Admins bekommen eine Benachrichtigung
// viaLink: Anfrage über einen alten Einladungslink (ohne Schlüssel) in einer Welt „Nur auf Einladung“; die Admins entscheiden
export async function requestWorldJoin(worldId: string, message: string, characterId?: string | null, viaLink = false): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: world } = await supabase.from("worlds").select("name, created_by, join_mode").eq("id", worldId).maybeSingle<{ name: string; created_by: string; join_mode: string }>();
  if (!world) return "Diese Welt gibt es nicht.";
  if (world.join_mode === "open") return "Du kannst dieser Welt direkt beitreten.";
  if (world.join_mode === "invite" && !viaLink) return "In diese Welt kommt man nur auf Einladung.";

  // Gewünschte Rolle: muss in der Vorschau dieser Welt als frei geführt sein
  let roleName: string | null = null;
  if (characterId) {
    const { data: roles } = await supabase.rpc("world_preview_roles", { p_world: worldId });
    const role = ((roles ?? []) as { id: string; name: string }[]).find((r) => r.id === characterId);
    if (!role) return "Diese Rolle ist nicht mehr frei.";
    roleName = role.name;
  }

  const { error } = await supabase
    .from("world_join_requests")
    .insert({ world_id: worldId, user_id: user.id, message: message.trim().slice(0, 500), ...(characterId ? { character_id: characterId } : {}) });
  if (error) return /duplicate|unique/i.test(error.message) ? "Du hast schon angefragt." : error.message;

  const { data: admins } = await supabase.from("world_members").select("user_id").eq("world_id", worldId).eq("role", "admin");
  const recipients = new Set([world.created_by, ...(admins ?? []).map((a) => a.user_id as string)]);
  recipients.delete(user.id);
  const who = await actor(supabase, user.id);
  await Promise.all(
    [...recipients].map((id) =>
      createNotification(supabase, {
        userId: id,
        type: "world_request",
        actorName: who.name,
        actorAvatarUrl: who.avatarUrl,
        link: `/worlds/${worldId}`,
        message: roleName ? `möchte „${world.name}“ beitreten und die Rolle ${roleName} übernehmen` : `möchte „${world.name}“ beitreten`,
      }),
    ),
  );

  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/worlds/entdecken");
  return null;
}

// Eigene offene Anfrage zurückziehen
export async function withdrawWorldJoin(worldId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("world_join_requests").delete().eq("world_id", worldId).eq("user_id", user.id).eq("status", "pending");
  if (error) return error.message;
  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/worlds/entdecken");
  return null;
}

// Anfrage annehmen oder ablehnen (nur Besitzer:in und Admins); die anfragende Person wird benachrichtigt
// giveRole: hat die Person eine Rolle gewünscht, wird sie mit der Aufnahme gleich übergeben (sonst als offene Rollenanfrage vorgemerkt)
export async function decideJoinRequest(requestId: string, approve: boolean, giveRole = false): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: request } = await supabase
    .from("world_join_requests")
    .select("world_id, user_id, character_id, worlds(name)")
    .eq("id", requestId)
    .maybeSingle<{ world_id: string; user_id: string; character_id: string | null; worlds: { name: string } | null }>();
  if (!request) return "Anfrage nicht gefunden.";

  const { data: result, error } = await supabase.rpc("decide_join_request", { p_request: requestId, p_approve: approve });
  if (error) return error.message;
  if (result) return result as string;

  // Gewünschte Rolle: gleich übergeben oder als Rollenanfrage vormerken
  let givenRole: string | null = null;
  if (approve && request.character_id) {
    const { data: role } = await supabase.rpc("resolve_requested_role", { p_request: requestId, p_give: giveRole });
    const r = role as { character_name: string; given: boolean } | null;
    if (r?.given) givenRole = r.character_name;
  }

  const who = await actor(supabase, user.id);
  await createNotification(supabase, {
    userId: request.user_id,
    type: "world_request_result",
    actorName: who.name,
    actorAvatarUrl: who.avatarUrl,
    link: approve ? `/worlds/${request.world_id}` : "/worlds/entdecken",
    message: approve
      ? `hat deine Anfrage für „${request.worlds?.name ?? "die Welt"}“ angenommen${givenRole ? ` und dir die Rolle ${givenRole} gegeben` : ""}`
      : `hat deine Anfrage für „${request.worlds?.name ?? "die Welt"}“ abgelehnt`,
  });

  revalidatePath(`/worlds/${request.world_id}`);
  revalidatePath("/characters");
  revalidatePath("/", "layout");
  return null;
}
