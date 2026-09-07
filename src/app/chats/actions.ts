"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { sendPushToUser } from "@/lib/push";

export async function createChat(_prevState: string | null, formData: FormData) {
  const isGroup = formData.get("is_group") === "on";
  const name = String(formData.get("name") ?? "").trim();
  const participantIds = formData.getAll("participants").map(String);

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

export async function sendMessage(
  chatId: string,
  characterId: string,
  content: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, character_id: characterId, content });
  if (error) return error.message;

  // Die In-App-Benachrichtigung legt bereits der on_message_notify-Trigger an;
  // hier zusätzlich noch eine echte Push-Benachrichtigung an die anderen
  // Teilnehmer:innen (unabhängig davon, ob sie die App gerade offen haben).
  const [{ data: participants }, { data: sender }] = await Promise.all([
    supabase.from("chat_participants").select("characters(owner_id)").eq("chat_id", chatId),
    supabase.from("characters").select("name, owner_id").eq("id", characterId).maybeSingle(),
  ]);

  const recipientIds = new Set(
    (participants ?? [])
      .map((p) => (p as unknown as { characters: { owner_id: string } | null }).characters?.owner_id)
      .filter((id): id is string => Boolean(id) && id !== sender?.owner_id),
  );

  await Promise.all(
    Array.from(recipientIds).map((recipientId) =>
      sendPushToUser(recipientId, {
        title: sender?.name ?? "Neue Nachricht",
        body: content.length > 120 ? `${content.slice(0, 117)}...` : content,
        url: `/chats/${chatId}`,
      }),
    ),
  );

  return null;
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
  const { error } = await supabase
    .from("chat_participants")
    .insert({ chat_id: chatId, character_id: characterId });

  if (error) return error.message;

  await supabase.from("chats").update({ is_group: true }).eq("id", chatId);

  revalidatePath(`/chats/${chatId}`);
  return null;
}
