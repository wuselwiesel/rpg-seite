"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { isVideoUrl } from "@/lib/chat-media-url";

export async function sendAccountMessage(
  chatId: string,
  content: string,
  id?: string,
  imageUrl?: string | null,
): Promise<string | null> {
  const text = content.trim().slice(0, 4000);
  if (!text && !imageUrl) return "Nachricht darf nicht leer sein.";
  if (imageUrl && !imageUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/`)) {
    return "Dieses Bild kann nicht gesendet werden.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  if (await isRateLimited(supabase, "account_messages", "sender_id", user.id, 10, 30)) {
    return "Zu viele Nachrichten in kurzer Zeit. Kurz warten und nochmal versuchen.";
  }

  const { error } = await supabase
    .from("account_messages")
    .insert({
      ...(id ? { id } : {}),
      chat_id: chatId,
      sender_id: user.id,
      content: text,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    });
  if (error) return error.message;

  after(() => pushToChatPartners(chatId, user.id, text || (isVideoUrl(imageUrl) ? "Video" : "Foto")));
  return null;
}

async function pushToChatPartners(chatId: string, senderId: string, text: string) {
  const supabase = await createClient();
  const [{ data: participants }, { data: sender }, { data: chat }] = await Promise.all([
    supabase.from("account_chat_participants").select("user_id, muted").eq("chat_id", chatId),
    supabase.from("profiles").select("username, nickname").eq("id", senderId).maybeSingle(),
    supabase.from("account_chats").select("kind, name, worlds(name)").eq("id", chatId).maybeSingle<{ kind: string; name: string | null; worlds: { name: string } | null }>(),
  ]);
  const senderName = sender?.nickname || sender?.username || "Neue Nachricht";
  const groupName = chat?.kind === "world" ? chat.worlds?.name : chat?.kind === "group" ? chat.name : null;
  const title = groupName ? `${senderName} · ${groupName}` : senderName;
  await Promise.all(
    (participants ?? [])
      .filter((p) => p.user_id !== senderId && !p.muted)
      .map((p) =>
        sendPushToUser(
          p.user_id,
          { title, body: text.length > 80 ? `${text.slice(0, 80)}…` : text, url: `/redaktion/chat/${chatId}` },
          { type: "message" },
        ),
      ),
  );
}

export async function updateAccountMessage(messageId: string, content: string): Promise<string | null> {
  const text = content.trim().slice(0, 4000);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase
    .from("account_messages")
    .update({ content: text, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", messageId)
    .eq("sender_id", user.id);
  if (error) return error.message.includes("account_messages_content_or_image") ? "Nachricht darf nicht leer sein." : error.message;
  if (!count) return "Konnte nicht geändert werden.";
  return null;
}

export async function deleteAccountMessage(messageId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase
    .from("account_messages")
    .delete({ count: "exact" })
    .eq("id", messageId)
    .eq("sender_id", user.id);
  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";
  return null;
}

export async function setAccountChatMuted(chatId: string, muted: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase
    .from("account_chat_participants")
    .update({ muted })
    .eq("chat_id", chatId)
    .eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/redaktion/chat");
  return null;
}

// Neue Gruppe mit befreundeten Accounts anlegen (Name + mindestens zwei weitere Personen) und öffnen.
export async function createAccountGroup(_prev: string | null, formData: FormData): Promise<string | null> {
  const name = String(formData.get("name") ?? "").trim();
  const members = formData.getAll("member").map(String).filter(Boolean);
  if (!name) return "Bitte einen Gruppennamen angeben.";
  if (members.length < 2) return "Wähle mindestens zwei Personen aus.";
  const supabase = await createClient();
  const { data: chatId, error } = await supabase.rpc("create_account_group", { p_name: name, p_members: members });
  if (error || !chatId) return error?.message ?? "Gruppe konnte nicht angelegt werden.";
  revalidatePath("/redaktion/chat");
  redirect(`/redaktion/chat/${chatId}`);
}

export async function updateAccountGroup(chatId: string, name: string, avatarUrl: string | null): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_account_group", { p_chat: chatId, p_name: name, p_avatar_url: avatarUrl });
  if (error) return error.message;
  revalidatePath("/redaktion/chat", "layout");
  return null;
}

export async function addAccountGroupMembers(chatId: string, userIds: string[]): Promise<string | null> {
  if (!userIds.length) return null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_account_group_members", { p_chat: chatId, p_members: userIds });
  if (error) return error.message;
  revalidatePath("/redaktion/chat", "layout");
  return null;
}

// Eine Person aus der Gruppe nehmen oder (mit der eigenen Id) selbst gehen.
export async function removeAccountGroupMember(chatId: string, userId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("remove_account_group_member", { p_chat: chatId, p_user: userId });
  if (error) return error.message;
  revalidatePath("/redaktion/chat", "layout");
  return null;
}
