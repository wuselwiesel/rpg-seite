import Link from "next/link";
import { SquarePen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { getUnreadChatIds } from "@/lib/chat-reads";
import type { Character, Chat } from "@/lib/types";
import { ChatListItem } from "./chat-list-item";

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
    .select("chat_id")
    .eq("character_id", activeCharacter.id);
  const myChatIds = (myParticipantRows ?? []).map((row) => row.chat_id);

  const { data: chats } = myChatIds.length
    ? await supabase
        .from("chats")
        .select("*, chat_participants(muted, characters(*))")
        .in("id", myChatIds)
        .order("created_at", { ascending: false })
        .returns<ChatWithParticipants[]>()
    : { data: [] as ChatWithParticipants[] };

  const ownCharacters = await getOwnCharacters(user.id, activeWorld.id);
  const unreadChatIds = new Set(await getUnreadChatIds(user.id, ownCharacters.map((c) => c.id), activeCharacter.id));

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 px-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl text-fg">{activeCharacter.username ?? activeCharacter.name}</h1>
          <p className="truncate text-xs text-muted">Nachrichten in {activeWorld.name}</p>
        </div>
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

      <ul className="flex flex-col">
        {chats?.map((chat) => {
          const others = chat.chat_participants.map((p) => p.characters).filter((c) => c.id !== activeCharacter.id);
          const title = (chat.is_group ? chat.name : (others[0]?.name ?? chat.name)) ?? "Chat";
          return (
            <li key={chat.id}>
              <ChatListItem
                id={chat.id}
                title={title}
                avatarUrl={chat.is_group ? chat.avatar_url : others[0]?.avatar_url}
                participantCount={chat.chat_participants.length}
                unread={unreadChatIds.has(chat.id)}
                muted={chat.chat_participants.some((p) => p.characters.owner_id === user.id && p.muted)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
