import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { CharacterAvatar } from "./character-avatar";
import type { Character, Chat } from "@/lib/types";

type ChatWithParticipants = Chat & {
  chat_participants: { characters: Character }[];
};

export async function FeedSidebar({
  userId,
  worldId,
  worldName,
}: {
  userId: string;
  worldId: string;
  worldName: string;
}) {
  const supabase = await createClient();
  const activeCharacter = await getActiveCharacter(userId, worldId);

  const [{ data: characters }, { data: chats }] = await Promise.all([
    supabase
      .from("characters")
      .select("*")
      .eq("world_id", worldId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Character[]>(),
    supabase
      .from("chats")
      .select("*, chat_participants!inner(characters!inner(*))")
      .eq("chat_participants.characters.world_id", worldId)
      .order("created_at", { ascending: false })
      .limit(4)
      .returns<ChatWithParticipants[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/story"
        className="flex items-center gap-3 rounded-2xl bg-accent-strong px-4 py-3 text-on-accent-strong transition hover:opacity-90"
      >
        <BookOpen className="h-5 w-5 shrink-0" strokeWidth={2} />
        <span className="text-sm font-medium">Zur Story von {worldName}</span>
      </Link>

      <section>
        <h2 className="mb-3 px-1 font-serif text-lg text-fg">Charaktere in {worldName}</h2>
        <div className="flex flex-wrap gap-3 rounded-2xl bg-surface p-4">
          {characters?.length ? (
            characters.map((character) => (
              <Link
                key={character.id}
                href={`/characters/${character.id}`}
                className="flex flex-col items-center gap-1.5"
                title={character.name}
              >
                <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={52} />
                <span className="max-w-[60px] truncate text-xs text-fg-soft">
                  {character.name.split(" ")[0]}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted">Noch keine Charaktere.</p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-serif text-lg text-fg">Deine Chats</h2>
          <Link href="/chats" className="text-sm text-accent hover:underline">
            Alle
          </Link>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3">
          {chats?.length ? (
            chats.map((chat) => {
              const others = chat.chat_participants
                .map((p) => p.characters)
                .filter((c) => c.id !== activeCharacter?.id);
              const title = chat.is_group ? chat.name : (others[0]?.name ?? chat.name ?? "Chat");

              return (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2"
                >
                  <CharacterAvatar
                    name={title ?? "?"}
                    avatarUrl={chat.is_group ? undefined : others[0]?.avatar_url}
                    size={36}
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
