"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

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

  after(() => pushToChatPartners(chatId, user.id, text || "Foto"));
  return null;
}

async function pushToChatPartners(chatId: string, senderId: string, text: string) {
  const supabase = await createClient();
  const [{ data: participants }, { data: sender }] = await Promise.all([
    supabase.from("account_chat_participants").select("user_id, muted").eq("chat_id", chatId),
    supabase.from("profiles").select("username, nickname").eq("id", senderId).maybeSingle(),
  ]);
  const name = sender?.nickname || sender?.username || "Neue Nachricht";
  await Promise.all(
    (participants ?? [])
      .filter((p) => p.user_id !== senderId && !p.muted)
      .map((p) =>
        sendPushToUser(
          p.user_id,
          { title: name, body: text.length > 80 ? `${text.slice(0, 80)}…` : text, url: `/redaktion/chat/${chatId}` },
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
