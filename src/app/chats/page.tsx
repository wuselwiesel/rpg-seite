import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
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

  const activeCharacter = await getActiveCharacter(user.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: chats } = await supabase
    .from("chats")
    .select("*, chat_participants(characters(*))")
    .order("created_at", { ascending: false })
    .returns<ChatWithParticipants[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-stone-100">Chats</h1>
        <Link
          href="/chats/new"
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-amber-600"
        >
          + Neuer Chat
        </Link>
      </div>

      {!chats?.length && (
        <p className="text-stone-400">
          Noch keine Chats.{" "}
          <Link href="/chats/new" className="text-amber-500 hover:underline">
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
                className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/60 p-4 transition hover:border-amber-700/60"
              >
                {chat.is_group ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-700 text-stone-200">
                    #
                  </div>
                ) : (
                  <CharacterAvatar name={title ?? "?"} avatarUrl={others[0]?.avatar_url} />
                )}
                <div>
                  <p className="font-medium text-stone-200">{title}</p>
                  <p className="text-xs text-stone-500">
                    {chat.chat_participants.length} Teilnehmer:innen
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
