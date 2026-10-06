"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { isVideoUrl } from "@/lib/chat-media-url";
import { createNotification } from "@/lib/notifications";
import { findMentionedMembers } from "@/lib/account-mentions";

export async function sendAccountMessage(
  chatId: string,
  content: string,
  id?: string,
  imageUrl?: string | null,
  replyToId?: string | null,
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

  // @-Erwähnungen gibt es nur in Gruppen und im Welt-Chat
  const { data: chat } = await supabase
    .from("account_chats")
    .select("kind, name, story_post_id, story_posts(title), worlds(name), account_chat_participants(user_id, profiles(username, nickname))")
    .eq("id", chatId)
    .maybeSingle<{
      kind: string;
      name: string | null;
      story_post_id: string | null;
      story_posts: { title: string } | null;
      worlds: { name: string } | null;
      account_chat_participants: { user_id: string; profiles: { username: string; nickname: string | null } | null }[];
    }>();
  const mentioned =
    chat && chat.kind !== "direct"
      ? findMentionedMembers(
          text,
          chat.account_chat_participants
            .filter((p) => p.user_id !== user.id && p.profiles)
            .map((p) => ({ id: p.user_id, username: p.profiles!.username })),
        )
      : [];

  const { error } = await supabase
    .from("account_messages")
    .insert({
      ...(id ? { id } : {}),
      chat_id: chatId,
      sender_id: user.id,
      content: text,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(replyToId ? { reply_to_id: replyToId } : {}),
      ...(mentioned.length ? { mentioned_user_ids: mentioned } : {}),
    });
  if (error) return error.message;

  const chatTitle = chat?.kind === "world" ? chat.worlds?.name : chat?.kind === "scene" ? chat.story_posts?.title : chat?.name;
  // Der Chat einer Szene öffnet sich in der Szene
  const chatUrl = chat?.story_post_id ? `/story/${chat.story_post_id}?chat=1` : `/redaktion/chat/${chatId}`;
  after(async () => {
    // Erwähnte bekommen eine eigene Benachrichtigung, auch wenn der Chat stumm ist; alle anderen den normalen Push.
    if (mentioned.length) {
      const sb = await createClient();
      const { data: me } = await sb.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle();
      await Promise.all(
        mentioned.map((userId) =>
          createNotification(sb, {
            userId,
            type: "mention",
            actorName: me?.nickname || me?.username || "Jemand",
            actorAvatarUrl: me?.avatar_url ?? null,
            link: chatUrl,
            message: chatTitle ? `hat dich in „${chatTitle}“ erwähnt` : "hat dich in einem Chat erwähnt",
          }),
        ),
      );
    }
    await pushToChatPartners(chatId, user.id, text || (isVideoUrl(imageUrl) ? "Video" : "Foto"), mentioned, chatUrl, chatTitle ?? null);
  });
  return null;
}

// `chatName`: Gruppen-, Welt- oder Szenenname für den Titel der Meldung; `url`: wohin ein Klick führt
async function pushToChatPartners(chatId: string, senderId: string, text: string, skipUserIds: string[], url: string, chatName: string | null) {
  const supabase = await createClient();
  const [{ data: participants }, { data: sender }] = await Promise.all([
    supabase.from("account_chat_participants").select("user_id, muted").eq("chat_id", chatId),
    supabase.from("profiles").select("username, nickname").eq("id", senderId).maybeSingle(),
  ]);
  const senderName = sender?.nickname || sender?.username || "Neue Nachricht";
  const title = chatName ? `${senderName} · ${chatName}` : senderName;
  await Promise.all(
    (participants ?? [])
      .filter((p) => p.user_id !== senderId && !p.muted && !skipUserIds.includes(p.user_id))
      .map((p) =>
        sendPushToUser(
          p.user_id,
          { title, body: text.length > 80 ? `${text.slice(0, 80)}…` : text, url },
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

// Nachricht anheften oder lösen (jedes Mitglied des Chats).
export async function setAccountMessagePin(messageId: string, pin: boolean): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_message_pin", { p_message: messageId, p_pin: pin });
  return error ? error.message : null;
}
