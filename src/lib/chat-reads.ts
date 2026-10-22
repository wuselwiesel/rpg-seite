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

// Eine Abfrage für die Chatliste: Zähler je Chat aus Sicht der aktiven Figur und die Gesamtzahl ungelesener Nachrichten je eigener Figur
// (für das Wechsel-Menü: bei welcher Figur wartet etwas).
export async function getUnreadOverview(
  userId: string,
  myCharacterIds: string[],
  activeCharacterId: string,
): Promise<{ forActive: Record<string, number>; perCharacter: Record<string, number> }> {
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
  const perCharacter: Record<string, number> = {};
  for (const id of myCharacterIds) {
    perCharacter[id] = Object.values(computeUnreadCounts(chats ?? [], reads ?? [], myCharacterIds, id)).reduce((a, b) => a + b, 0);
  }
  return { forActive: computeUnreadCounts(chats ?? [], reads ?? [], myCharacterIds, activeCharacterId), perCharacter };
}
