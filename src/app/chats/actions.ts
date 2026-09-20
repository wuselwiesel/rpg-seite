"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { sendPushToUser } from "@/lib/push";
import { isAllowedGifUrl } from "@/lib/gif";
import { mentionedCharacterIds } from "@/lib/mentions";

export async function createChat(_prevState: string | null, formData: FormData) {
  const isGroup = formData.get("is_group") === "on";
  const name = String(formData.get("name") ?? "").trim();
  const participantIds = formData.getAll("participants").map(String);
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  if (isGroup && !name) {
    return "Gruppenchats brauchen einen Namen.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) return "Keine aktive Welt.";

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) return "Du brauchst zuerst einen Charakter.";

  const allParticipantIds = Array.from(
    new Set([activeCharacter.id, ...participantIds]),
  );

  if (allParticipantIds.length < 2) {
    return "Wähle mindestens einen weiteren Charakter aus.";
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .insert({
      name: name || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      is_group: isGroup || allParticipantIds.length > 2,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (chatError || !chat) return chatError?.message ?? "Chat konnte nicht erstellt werden.";

  const { error: participantsError } = await supabase.from("chat_participants").insert(
    allParticipantIds.map((characterId) => ({ chat_id: chat.id, character_id: characterId })),
  );

  if (participantsError) return participantsError.message;

  redirect(`/chats/${chat.id}`);
}

export type SendMessageOptions = {
  // Vom Client vorab erzeugte ID, damit die Nachricht sofort (optimistisch) angezeigt werden kann.
  id?: string;
  replyToId?: string | null;
  sharedPostId?: string | null;
  storyId?: string | null;
};

export async function sendMessage(
  chatId: string,
  characterId: string,
  content: string,
  imageUrl?: string | null,
  options: SendMessageOptions = {},
): Promise<string | null> {
  if (!content.trim() && !imageUrl && !options.sharedPostId) return "Nachricht darf nicht leer sein.";
  if (imageUrl) {
    const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/`;
    if (!imageUrl.startsWith(storage) && !isAllowedGifUrl(imageUrl)) return "Dieses Bild kann nicht gesendet werden.";
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase.from("messages").insert({
    ...(options.id ? { id: options.id } : {}),
    chat_id: chatId,
    character_id: characterId,
    content,
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(options.replyToId ? { reply_to_id: options.replyToId } : {}),
    ...(options.sharedPostId ? { shared_post_id: options.sharedPostId } : {}),
    ...(options.storyId ? { story_id: options.storyId } : {}),
  });
  if (error) return error.message;

  // Die In-App-Benachrichtigung legt bereits der on_message_notify-Trigger an. Die echten
  // Push-Nachrichten gehen nach der Antwort raus, damit das Senden sich sofort anfühlt.
  after(() => pushToRecipients(chatId, characterId, content));

  return null;
}

async function pushToRecipients(chatId: string, characterId: string, content: string) {
  const supabase = await createClient();
  const mentioned = new Set(mentionedCharacterIds(content));
  const [{ data: participants }, { data: sender }] = await Promise.all([
    supabase.from("chat_participants").select("character_id, muted, characters(owner_id)").eq("chat_id", chatId),
    supabase.from("characters").select("name, owner_id").eq("id", characterId).maybeSingle(),
  ]);

  // Nur angeschriebene Charaktere (nicht der Absender) bekommen einen Push; der Link
  // enthält den Empfänger-Charakter, damit ein Klick zu ihm wechselt.
  const recipients = new Map<string, string>();
  for (const p of participants ?? []) {
    const row = p as unknown as { character_id: string; muted: boolean; characters: { owner_id: string } | null };
    // Stumme Chats melden sich nur bei @-Erwähnung.
    if (row.muted && !mentioned.has(row.character_id)) continue;
    if (row.character_id !== characterId && row.characters?.owner_id) {
      recipients.set(row.character_id, row.characters.owner_id);
    }
  }

  await Promise.all(
    Array.from(recipients.entries()).map(([recipientCharacterId, ownerId]) =>
      sendPushToUser(ownerId, {
        title: sender?.name ?? "Neue Nachricht",
        body: mentioned.has(recipientCharacterId)
          ? "hat dich in einer Nachricht erwähnt"
          : "hat dir eine Nachricht geschickt",
        url: `/chats/${chatId}?as=${recipientCharacterId}`,
      }),
    ),
  );
}

export type ShareTarget = { id: string; title: string; avatarUrl: string | null };

// Chats des Charakters, in die ein Beitrag geteilt werden kann.
export async function getShareTargets(characterId: string): Promise<ShareTarget[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_participants")
    .select("chats(id, name, is_group, avatar_url, chat_participants(characters(id, name, avatar_url)))")
    .eq("character_id", characterId);

  type Row = {
    chats: {
      id: string;
      name: string | null;
      is_group: boolean;
      avatar_url: string | null;
      chat_participants: { characters: { id: string; name: string; avatar_url: string | null } | null }[];
    } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .map((r) => r.chats)
    .filter((c): c is NonNullable<Row["chats"]> => Boolean(c))
    .map((c) => {
      const others = c.chat_participants.map((p) => p.characters).filter((x) => x && x.id !== characterId);
      return c.is_group
        ? { id: c.id, title: c.name ?? "Gruppe", avatarUrl: c.avatar_url }
        : { id: c.id, title: others[0]?.name ?? c.name ?? "Chat", avatarUrl: others[0]?.avatar_url ?? null };
    });
}

export async function sharePostToChat(chatId: string, characterId: string, postId: string): Promise<string | null> {
  return sendMessage(chatId, characterId, "", null, { sharedPostId: postId });
}

export async function updateMessage(messageId: string, content: string): Promise<string | null> {
  const trimmed = content.trim();
  if (!trimmed) return "Nachricht darf nicht leer sein.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("messages")
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  return error?.message ?? null;
}

export async function deleteMessage(messageId: string, chatId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("messages")
    .delete({ count: "exact" })
    .eq("id", messageId);

  if (error) return error.message;
  if (!count) return "Nachricht konnte nicht gelöscht werden.";

  revalidatePath(`/chats/${chatId}`);
  return null;
}

export async function addChatParticipant(
  chatId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const characterId = String(formData.get("character_id") ?? "");
  if (!characterId) return "Bitte einen Charakter auswählen.";

  const supabase = await createClient();
  const { data: chat } = await supabase
    .from("chats")
    .select("is_group, name")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) return "Chat nicht gefunden.";

  if (!chat.is_group) {
    return "Zu privaten Chats können keine Personen hinzugefügt werden. Erstelle stattdessen einen Gruppenchat.";
  }

  const { error } = await supabase
    .from("chat_participants")
    .insert({ chat_id: chatId, character_id: characterId });

  if (error) return error.message;

  revalidatePath(`/chats/${chatId}`);
  revalidatePath("/chats");
  return null;
}

export async function renameChat(
  chatId: string,
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Gib der Gruppe einen Namen.";
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("chats")
    .update({ name, avatar_url: avatarUrl || null }, { count: "exact" })
    .eq("id", chatId)
    .eq("is_group", true);

  if (error) return error.message;
  if (!count) return "Nur Gruppenchats können umbenannt werden.";

  revalidatePath(`/chats/${chatId}`);
  revalidatePath("/chats");
  return null;
}

export async function deleteChat(chatId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase.from("chats").delete({ count: "exact" }).eq("id", chatId);
  if (error) return error.message;
  if (!count) return "Nur wer den Gruppenchat erstellt hat, kann ihn löschen.";

  revalidatePath("/chats");
  redirect("/chats");
}

// Chat stumm schalten: Benachrichtigungen kommen dann nur noch bei @-Erwähnung. Gilt für alle eigenen Charaktere im Chat.
export async function setChatMuted(chatId: string, muted: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data: mine } = await supabase.from("characters").select("id").eq("owner_id", user.id);
  const ids = (mine ?? []).map((c) => c.id);
  if (ids.length === 0) return null;
  const { error } = await supabase.from("chat_participants").update({ muted }).eq("chat_id", chatId).in("character_id", ids);
  if (error) return error.message;
  revalidatePath("/chats");
  return null;
}
