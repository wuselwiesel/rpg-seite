import "server-only";
import { createClient } from "@/lib/supabase/server";

type ChatWithMessages = {
  id: string;
  messages: { created_at: string; character_id: string }[];
};

export async function getUnreadChatIds(
  userId: string,
  myCharacterIds: string[],
): Promise<string[]> {
  const supabase = await createClient();

  const [{ data: chats }, { data: reads }] = await Promise.all([
    supabase.from("chats").select("id, messages(created_at, character_id)").returns<ChatWithMessages[]>(),
    supabase.from("chat_reads").select("chat_id, last_read_at").eq("user_id", userId),
  ]);

  const readMap = new Map((reads ?? []).map((r) => [r.chat_id, r.last_read_at]));

  return (chats ?? [])
    .filter((chat) => {
      const lastRead = readMap.get(chat.id);
      return chat.messages.some(
        (m) =>
          !myCharacterIds.includes(m.character_id) &&
          (!lastRead || new Date(m.created_at) > new Date(lastRead)),
      );
    })
    .map((chat) => chat.id);
}
