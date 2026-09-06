"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  await supabase.rpc("create_notification", {
    p_user_id: target.id,
    p_type: "friend_request",
    p_actor_name: own?.nickname || own?.username || "Jemand",
    p_actor_avatar_url: own?.avatar_url ?? null,
    p_link: "/friends",
    p_message: "möchte mit dir befreundet sein",
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

    await supabase.rpc("create_notification", {
      p_user_id: friendship.requester_id,
      p_type: "friend_accept",
      p_actor_name: own?.nickname || own?.username || "Jemand",
      p_actor_avatar_url: own?.avatar_url ?? null,
      p_link: "/friends",
      p_message: "hat deine Freundschaftsanfrage angenommen",
    });
  }

  revalidatePath("/friends");
}

export async function removeFriendship(friendshipId: string) {
  const supabase = await createClient();
  await supabase.from("friendships").delete().eq("id", friendshipId);
  revalidatePath("/friends");
}
