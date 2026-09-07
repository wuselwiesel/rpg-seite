"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

export async function sendFriendRequest(_prevState: string | null, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  if (!username) return "Bitte einen Benutzernamen angeben.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: target } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();

  if (!target) return `Niemand mit dem Namen "${username}" gefunden.`;
  if (target.id === user.id) return "Du kannst dich nicht selbst hinzufügen.";

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: target.id });

  if (error) {
    if (error.code === "23505") return `Ihr seid schon befreundet oder es gibt bereits eine Anfrage mit ${target.username}.`;
    return error.message;
  }

  const { data: own } = await supabase
    .from("profiles")
    .select("username, nickname, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  await createNotification(supabase, {
    userId: target.id,
    type: "friend_request",
    actorName: own?.nickname || own?.username || "Jemand",
    actorAvatarUrl: own?.avatar_url ?? null,
    link: "/friends",
    message: "möchte mit dir befreundet sein",
  });

  revalidatePath("/friends");
  return null;
}

export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("requester_id")
    .eq("id", friendshipId)
    .maybeSingle();

  await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);

  if (friendship) {
    const { data: own } = await supabase
      .from("profiles")
      .select("username, nickname, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    await createNotification(supabase, {
      userId: friendship.requester_id,
      type: "friend_accept",
      actorName: own?.nickname || own?.username || "Jemand",
      actorAvatarUrl: own?.avatar_url ?? null,
      link: "/friends",
      message: "hat deine Freundschaftsanfrage angenommen",
    });
  }

  revalidatePath("/friends");
}

export async function removeFriendship(friendshipId: string) {
  const supabase = await createClient();
  await supabase.from("friendships").delete().eq("id", friendshipId);
  revalidatePath("/friends");
}
