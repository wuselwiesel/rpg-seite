import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeUnreadCounts, type ChatWithMessages } from "@/lib/unread-counts";

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
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(100, { referencedTable: "messages" })
      .returns<ChatWithMessages[]>(),
    supabase.from("chat_reads").select("chat_id, last_read_at").eq("user_id", userId),
  ]);

  return computeUnreadCounts(chats ?? [], reads ?? [], myCharacterIds, forCharacterId);
}

export async function getUnreadChatIds(
  userId: string,
  myCharacterIds: string[],
  forCharacterId?: string,
): Promise<string[]> {
  return Object.keys(await getUnreadCounts(userId, myCharacterIds, forCharacterId));
}
