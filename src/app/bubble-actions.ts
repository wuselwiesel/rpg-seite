"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { getUnreadCounts } from "@/lib/chat-reads";
import { getAccountChats } from "@/lib/account-chat";
import { messagePreview } from "@/lib/chat-preview";
import type { Character } from "@/lib/types";

export type BubbleChat = {
  kind: "account" | "rp";
  id: string;
  title: string;
  avatarUrl: string | null;
  lastText: string | null;
  lastAt: string | null;
  lastMine: boolean;
  unread: number;
  // Accounts der anderen Seite (für die Online-Anzeige)
  otherUserIds: string[];
};

export type BubbleCharacter = { id: string; name: string; avatarUrl: string | null };

// activeCharacterId = der Charakter, mit dem die RPG-Chats gelesen und geschrieben werden.
export type BubbleData = { chats: BubbleChat[]; activeCharacterId: string | null; characters: BubbleCharacter[] };

// Alle Chats für die schwebende Chat-Blase: Redaktions-Chats (Account) und RPG-Chats des gewählten Charakters.
export async function getBubbleChats(characterId?: string | null): Promise<BubbleData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { chats: [], activeCharacterId: null, characters: [] };

  const chats: BubbleChat[] = (await getAccountChats(user.id)).map((c) => ({
    kind: "account",
    id: c.id,
    title: c.partner?.nickname || c.partner?.username || "Unbekannt",
    avatarUrl: c.partner?.avatar_url ?? null,
    lastText: c.lastMessage ? messagePreview(c.lastMessage) : null,
    lastAt: c.lastMessage?.created_at ?? null,
    lastMine: c.lastMessage?.sender_id === user.id,
    unread: c.unread,
    otherUserIds: c.partner ? [c.partner.id] : [],
  }));

  let activeCharacterId: string | null = null;
  const world = await getActiveWorld(user.id);
  const ownCharacters = world ? await getOwnCharacters(user.id, world.id) : [];
  const characters: BubbleCharacter[] = ownCharacters.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatar_url }));
  const chosen = characterId ? ownCharacters.find((c) => c.id === characterId) : null;
  const active = chosen ?? (world ? await getActiveCharacter(user.id, world.id) : null);
  if (world && active) {
    activeCharacterId = active.id;
    const { data: mine } = await supabase.from("chat_participants").select("chat_id").eq("character_id", active.id);
    const ids = (mine ?? []).map((r) => r.chat_id);
    if (ids.length) {
      const own = ownCharacters;
      const [{ data: rpChats }, unread, { data: recent }] = await Promise.all([
        supabase
          .from("chats")
          .select("id, name, is_group, avatar_url, created_at, chat_participants(characters(id, name, avatar_url, owner_id))")
          .in("id", ids)
          .returns<
            {
              id: string;
              name: string | null;
              is_group: boolean;
              avatar_url: string | null;
              created_at: string;
              chat_participants: { characters: Pick<Character, "id" | "name" | "avatar_url" | "owner_id"> }[];
            }[]
          >(),
        getUnreadCounts(user.id, own.map((c) => c.id), active.id),
        supabase
          .from("messages")
          .select("chat_id, character_id, content, image_url, shared_post_id, story_id, created_at")
          .in("chat_id", ids)
          .order("created_at", { ascending: false })
          .limit(Math.max(60, ids.length * 4)),
      ]);
      const last = new Map<string, NonNullable<typeof recent>[number]>();
      for (const m of recent ?? []) if (!last.has(m.chat_id)) last.set(m.chat_id, m);
      for (const c of rpChats ?? []) {
        const others = c.chat_participants.map((p) => p.characters).filter((ch) => ch.id !== active.id);
        const l = last.get(c.id);
        chats.push({
          kind: "rp",
          id: c.id,
          title: (c.is_group ? c.name : (others[0]?.name ?? c.name)) ?? "Chat",
          avatarUrl: c.is_group ? c.avatar_url : (others[0]?.avatar_url ?? null),
          lastText: l ? messagePreview(l) : null,
          lastAt: l?.created_at ?? c.created_at,
          lastMine: l?.character_id === active.id,
          unread: unread[c.id] ?? 0,
          otherUserIds: [...new Set(others.map((o) => o.owner_id).filter((id) => id !== user.id))],
        });
      }
    }
  }

  chats.sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
  return { chats, activeCharacterId, characters };
}

// Exakte ungelesene Zähler für die Blase: RPG-Chats aus der Sicht des gewählten (sonst aktiven) Charakters, dazu die
// Redaktions-Chats (stummgeschaltete zählen nicht).
export async function getBubbleUnread(characterId?: string | null): Promise<{ rp: Record<string, number>; account: Record<string, number> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rp: {}, account: {} };

  const world = await getActiveWorld(user.id);
  const own = world ? await getOwnCharacters(user.id, world.id) : [];
  const chosen = characterId ? own.find((c) => c.id === characterId) : null;
  const active = chosen ?? (world ? await getActiveCharacter(user.id, world.id) : null);

  const [rp, accountChats] = await Promise.all([
    active ? getUnreadCounts(user.id, own.map((c) => c.id), active.id) : Promise.resolve({} as Record<string, number>),
    getAccountChats(user.id),
  ]);
  const account: Record<string, number> = {};
  for (const c of accountChats) if (c.unread > 0 && !c.muted) account[c.id] = c.unread;
  return { rp, account };
}
