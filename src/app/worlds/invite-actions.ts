"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

// Einladung in eine Welt annehmen oder ablehnen. Die einladende Person erfährt die Antwort.
export async function respondWorldInvite(inviteId: string, accept: boolean): Promise<{ error: string } | { worldId: string; accepted: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  // Weltname vorher holen: nach einer Absage ist die Welt für die Person nicht lesbar
  const { data: pending } = await supabase.rpc("my_world_invites");
  const invite = (Array.isArray(pending) ? pending : []).find((i: { id: string }) => i.id === inviteId) as { world_name: string } | undefined;

  const { data, error } = await supabase.rpc("respond_world_invite", { p_invite: inviteId, p_accept: accept });
  if (error) return { error: error.message };
  const result = data as { world_id: string; invited_by: string; accepted: boolean };

  const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  await createNotification(supabase, {
    userId: result.invited_by,
    type: "world_invite_result",
    actorName: me?.nickname || me?.username || "Jemand",
    actorAvatarUrl: me?.avatar_url ?? null,
    link: `/worlds/${result.world_id}`,
    message: `hat deine Einladung in „${invite?.world_name ?? "die Welt"}“ ${result.accepted ? "angenommen" : "abgelehnt"}`,
  });

  revalidatePath("/", "layout");
  revalidatePath("/worlds");
  revalidatePath(`/worlds/${result.world_id}`);
  return { worldId: result.world_id, accepted: result.accepted };
}

// Offene Einladung zurückziehen (Admins der Welt)
export async function withdrawWorldInvite(inviteId: string, worldId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_world_invite", { p_invite: inviteId });
  if (error) return error.message;
  revalidatePath(`/worlds/${worldId}`);
  return null;
}
