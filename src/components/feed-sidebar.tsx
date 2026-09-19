import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { CharacterAvatar } from "./character-avatar";
import type { Character, Chat } from "@/lib/types";

type ChatWithParticipants = Chat & {
  chat_participants: { characters: Character }[];
};

export async function FeedSidebar({ userId, worldId }: { userId: string; worldId: string }) {
  const supabase = await createClient();
  const activeCharacter = await getActiveCharacter(userId, worldId);

  let chats: ChatWithParticipants[] = [];
  if (activeCharacter) {
    const { data: myRows } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .eq("character_id", activeCharacter.id);
    const myChatIds = (myRows ?? []).map((row) => row.chat_id);
    if (myChatIds.length) {
      const { data } = await supabase
        .from("chats")
        .select("*, chat_participants(characters(*))")
        .in("id", myChatIds)
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<ChatWithParticipants[]>();
      chats = data ?? [];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {activeCharacter && (
        <Link
          href={`/characters/${activeCharacter.id}`}
          className="flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-surface-2"
        >
          <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={44} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">
              {activeCharacter.username ?? activeCharacter.name}
            </p>
            {activeCharacter.username && <p className="truncate text-xs text-muted">{activeCharacter.name}</p>}
          </div>
        </Link>
      )}
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-serif text-lg text-fg">Deine Chats</h2>
        <Link href="/chats" className="text-sm text-accent hover:underline">
          Alle
        </Link>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2">
        {chats.length ? (
          chats.map((chat) => {
            const others = chat.chat_participants
              .map((p) => p.characters)
              .filter((c) => c.id !== activeCharacter?.id);
            const title = chat.is_group ? chat.name : (others[0]?.name ?? chat.name ?? "Chat");

            return (
              <Link
                key={chat.id}
                href={`/chats/${chat.id}`}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-surface-2"
              >
                <CharacterAvatar
                  name={title ?? "?"}
                  avatarUrl={chat.is_group ? undefined : others[0]?.avatar_url}
                  size={32}
                />
                <span className="truncate text-sm text-fg-soft">{title}</span>
              </Link>
            );
          })
        ) : (
          <p className="px-2 py-1 text-sm text-muted">Noch keine Chats.</p>
        )}
      </div>
    </section>
    </div>
  );
}
