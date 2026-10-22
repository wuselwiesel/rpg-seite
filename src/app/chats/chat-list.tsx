import Link from "next/link";
import { Archive, SquarePen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { getUnreadOverview } from "@/lib/chat-reads";
import { messagePreview } from "@/lib/chat-preview";
import type { Character, Chat } from "@/lib/types";
import { ChatListItem } from "./chat-list-item";
import { ChatOwnerSwitch } from "./chat-owner-switch";

type ChatWithParticipants = Chat & {
  chat_participants: { muted: boolean; characters: Character }[];
};

export async function ChatList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) return null;
  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) return null;

  const { data: myParticipantRows } = await supabase
    .from("chat_participants")
    .select("chat_id, archived")
    .eq("character_id", activeCharacter.id);
  const myChatIds = (myParticipantRows ?? []).map((row) => row.chat_id);
  const archivedIds = new Set((myParticipantRows ?? []).filter((row) => row.archived).map((row) => row.chat_id));

  const { data: chats } = myChatIds.length
    ? await supabase
        .from("chats")
        .select("*, chat_participants(muted, characters(*))")
        .in("id", myChatIds)
        .order("created_at", { ascending: false })
        .returns<ChatWithParticipants[]>()
    : { data: [] as ChatWithParticipants[] };

  const ownCharacters = await getOwnCharacters(user.id, activeWorld.id);
  const { forActive: unreadCounts, perCharacter: unreadPerCharacter } = await getUnreadOverview(user.id, ownCharacters.map((c) => c.id), activeCharacter.id);

  // Letzte Nachricht je Chat (eine Abfrage; neueste zuerst, pro Chat zählt die erste).
  type LastMessage = { chat_id: string; character_id: string; content: string; image_url: string | null; shared_post_id: string | null; story_id: string | null; created_at: string };
  const lastByChat = new Map<string, LastMessage>();
  if (myChatIds.length) {
    const { data: recent } = await supabase
      .from("messages")
      .select("chat_id, character_id, content, image_url, shared_post_id, story_id, created_at")
      .in("chat_id", myChatIds)
      .order("created_at", { ascending: false })
      .limit(Math.max(60, myChatIds.length * 4))
      .returns<LastMessage[]>();
    for (const m of recent ?? []) if (!lastByChat.has(m.chat_id)) lastByChat.set(m.chat_id, m);
  }
  const sortedChats = [...(chats ?? [])].sort(
    (a, b) =>
      new Date(lastByChat.get(b.id)?.created_at ?? b.created_at).getTime() -
      new Date(lastByChat.get(a.id)?.created_at ?? a.created_at).getTime(),
  );

  const renderChat = (chat: (typeof sortedChats)[number]) => {
    const others = chat.chat_participants.map((p) => p.characters).filter((c) => c.id !== activeCharacter.id);
    const last = lastByChat.get(chat.id);
    const senderName = last
      ? last.character_id === activeCharacter.id
        ? "Du"
        : chat.is_group
          ? (chat.chat_participants.find((p) => p.characters.id === last.character_id)?.characters.name.split(" ")[0] ?? null)
          : null
      : null;
    const title = (chat.is_group ? chat.name : (others[0]?.name ?? chat.name)) ?? "Chat";
    return (
      <li key={chat.id}>
        <ChatListItem
          id={chat.id}
          title={title}
          avatarUrl={chat.is_group ? chat.avatar_url : others[0]?.avatar_url}
          online={chat.is_group ? null : (others[0]?.presence_online ?? false)}
          participantCount={chat.chat_participants.length}
          lastMessage={last ? { text: messagePreview(last), at: last.created_at, sender: senderName } : null}
          unreadCount={unreadCounts[chat.id] ?? 0}
          groupMembers={chat.is_group ? others.map((c) => ({ name: c.name, avatarUrl: c.avatar_url ?? null })) : []}
          muted={chat.chat_participants.some((p) => p.characters.owner_id === user.id && p.muted)}
        />
      </li>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 px-3">
        <ChatOwnerSwitch
          characters={ownCharacters.map((c) => ({ id: c.id, name: c.name, username: c.username ?? null, avatar_url: c.avatar_url ?? null }))}
          activeId={activeCharacter.id}
          unread={unreadPerCharacter}
          subtitle={`Nachrichten in ${activeWorld.name}`}
        />
        <Link
          href="/chats/new"
          aria-label="Neuer Chat"
          title="Neuer Chat"
          className="shrink-0 rounded-full p-2 text-fg transition hover:bg-surface-2"
        >
          <SquarePen className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </div>

      {!chats?.length && (
        <p className="px-3 text-sm text-muted">
          Noch keine Chats.{" "}
          <Link href="/chats/new" className="text-accent hover:underline">
            Starte einen.
          </Link>
        </p>
      )}

      <ul className="flex flex-col">{sortedChats.filter((c) => !archivedIds.has(c.id)).map(renderChat)}</ul>
      {archivedIds.size > 0 && (
        <details className="mt-2 border-t border-line px-1 pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted transition hover:text-fg [&::-webkit-details-marker]:hidden">
            <Archive className="h-3.5 w-3.5" strokeWidth={2} />
            Archiv ({sortedChats.filter((c) => archivedIds.has(c.id)).length})
          </summary>
          <ul className="flex flex-col">{sortedChats.filter((c) => archivedIds.has(c.id)).map(renderChat)}</ul>
        </details>
      )}
    </div>
  );
}
