import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { getUnreadChatIds } from "@/lib/chat-reads";
import { CharacterAvatar } from "@/components/character-avatar";
import type { Character, Chat } from "@/lib/types";

type ChatWithParticipants = Chat & {
  chat_participants: { characters: Character }[];
};

export default async function ChatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: chats } = await supabase
    .from("chats")
    .select("*, chat_participants!inner(characters!inner(*))")
    .eq("chat_participants.characters.world_id", activeWorld.id)
    .order("created_at", { ascending: false })
    .returns<ChatWithParticipants[]>();

  const ownCharacters = await getOwnCharacters(user.id, activeWorld.id);
  const unreadChatIds = new Set(
    await getUnreadChatIds(user.id, ownCharacters.map((c) => c.id)),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-fg">Chats</h1>
          <p className="truncate text-sm text-muted">in {activeWorld.name}</p>
        </div>
        <Link
          href="/chats/new"
          className="shrink-0 rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          + Neuer Chat
        </Link>
      </div>

      {!chats?.length && (
        <p className="text-muted">
          Noch keine Chats.{" "}
          <Link href="/chats/new" className="text-accent hover:underline">
            Starte einen.
          </Link>
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {chats?.map((chat) => {
          const others = chat.chat_participants
            .map((p) => p.characters)
            .filter((c) => c.id !== activeCharacter?.id);
          const title = chat.is_group
            ? chat.name
            : (others[0]?.name ?? chat.name ?? "Chat");

          return (
            <li key={chat.id}>
              <Link
                href={`/chats/${chat.id}`}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 transition hover:border-accent/60"
              >
                {chat.is_group ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg">
                    #
                  </div>
                ) : (
                  <CharacterAvatar name={title ?? "?"} avatarUrl={others[0]?.avatar_url} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{title}</p>
                  <p className="text-xs text-muted">
                    {chat.chat_participants.length} Teilnehmer:innen
                  </p>
                </div>
                {unreadChatIds.has(chat.id) && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-strong" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
