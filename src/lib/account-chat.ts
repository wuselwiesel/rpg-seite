import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type AccountChatSummary = {
  id: string;
  partner: Pick<Profile, "id" | "username" | "nickname" | "avatar_url"> | null;
  lastMessage: { content: string; sender_id: string; created_at: string } | null;
  unread: number;
  muted: boolean;
  sortAt: string;
};

type Row = {
  chat_id: string;
  last_read_at: string;
  muted: boolean;
  account_chats: {
    id: string;
    created_at: string;
    account_chat_participants: { user_id: string; profiles: Profile | null }[];
  } | null;
};

// Alle Redaktions-Chats des Accounts: Gegenüber, letzte Nachricht und Anzahl ungelesener Nachrichten.
export async function getAccountChats(userId: string): Promise<AccountChatSummary[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("account_chat_participants")
    .select("chat_id, last_read_at, muted, account_chats(id, created_at, account_chat_participants(user_id, profiles(*)))")
    .eq("user_id", userId)
    .returns<Row[]>();
  if (!rows?.length) return [];

  const chatIds = rows.map((r) => r.chat_id);
  const { data: recent } = await supabase
    .from("account_messages")
    .select("chat_id, content, sender_id, created_at")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: false })
    .limit(Math.max(80, chatIds.length * 6));

  const last = new Map<string, { content: string; sender_id: string; created_at: string }>();
  const unread = new Map<string, number>();
  const readAt = new Map(rows.map((r) => [r.chat_id, r.last_read_at]));
  for (const m of recent ?? []) {
    if (!last.has(m.chat_id)) last.set(m.chat_id, m);
    if (m.sender_id !== userId && m.created_at > (readAt.get(m.chat_id) ?? "")) {
      unread.set(m.chat_id, (unread.get(m.chat_id) ?? 0) + 1);
    }
  }

  return rows
    .map((r): AccountChatSummary => {
      const partner = r.account_chats?.account_chat_participants.find((p) => p.user_id !== userId)?.profiles ?? null;
      const lastMessage = last.get(r.chat_id) ?? null;
      return {
        id: r.chat_id,
        partner: partner
          ? { id: partner.id, username: partner.username, nickname: partner.nickname, avatar_url: partner.avatar_url }
          : null,
        lastMessage,
        unread: unread.get(r.chat_id) ?? 0,
        muted: r.muted,
        sortAt: lastMessage?.created_at ?? r.account_chats?.created_at ?? "",
      };
    })
    .sort((a, b) => b.sortAt.localeCompare(a.sortAt));
}
