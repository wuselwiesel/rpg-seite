import "server-only";
import { createClient } from "@/lib/supabase/server";

type ChatWithMessages = {
  id: string;
  messages: { created_at: string; character_id: string }[];
  chat_participants: { character_id: string }[];
};

// Ungelesen = neuere Nachricht als der letzte Lesezeitpunkt, die nicht von einem
// eigenen Charakter kommt, der selbst nicht der Empfänger ist: Schreibt ein eigener
// Charakter einem anderen eigenen Charakter, ist der Chat für Letzteren ungelesen.
// Mit forCharacterId wird nur aus Sicht dieses Charakters gezählt.
export async function getUnreadCounts(
  userId: string,
  myCharacterIds: string[],
  forCharacterId?: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();

  const [{ data: chats }, { data: reads }] = await Promise.all([
    supabase
      .from("chats")
      .select("id, messages(created_at, character_id), chat_participants(character_id)")
      .returns<ChatWithMessages[]>(),
    supabase.from("chat_reads").select("chat_id, last_read_at").eq("user_id", userId),
  ]);

  const readMap = new Map((reads ?? []).map((r) => [r.chat_id, r.last_read_at]));

  const counts: Record<string, number> = {};
  for (const chat of chats ?? []) {
    const lastRead = readMap.get(chat.id);
    const receivers = forCharacterId
      ? chat.chat_participants.filter((p) => p.character_id === forCharacterId).map((p) => p.character_id)
      : chat.chat_participants.filter((p) => myCharacterIds.includes(p.character_id)).map((p) => p.character_id);
    if (receivers.length === 0) continue;

    const count = chat.messages.filter(
      (m) =>
        (!lastRead || new Date(m.created_at) > new Date(lastRead)) &&
        receivers.some((receiverId) => receiverId !== m.character_id),
    ).length;
    if (count > 0) counts[chat.id] = count;
  }
  return counts;
}

export async function getUnreadChatIds(
  userId: string,
  myCharacterIds: string[],
  forCharacterId?: string,
): Promise<string[]> {
  return Object.keys(await getUnreadCounts(userId, myCharacterIds, forCharacterId));
}
