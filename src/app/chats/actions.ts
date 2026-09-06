"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";

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
