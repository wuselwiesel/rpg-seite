import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters, getActiveCharacter } from "@/lib/active-character";
import { getUnreadChatIds } from "@/lib/chat-reads";
import { CharacterSwitcher } from "./character-switcher";
import { ChatsNavLink } from "./chats-nav-link";
import { NotificationBell } from "./notification-bell";
import { logout } from "@/lib/actions/auth";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [characters, activeCharacter] = await Promise.all([
    getOwnCharacters(user.id),
    getActiveCharacter(user.id),
  ]);

  const myCharacterIds = characters.map((c) => c.id);
  const unreadChatIds = await getUnreadChatIds(user.id, myCharacterIds);

  return (
    <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-lg text-amber-500">
            Chronik
          </Link>
          <nav className="flex items-center gap-4 text-sm text-stone-300">
            <Link href="/" className="hover:text-amber-400">
              Feed
            </Link>
            <ChatsNavLink
              userId={user.id}
              myCharacterIds={myCharacterIds}
              initialUnreadChatIds={unreadChatIds}
            />
            <Link href="/characters" className="hover:text-amber-400">
              Charaktere
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <CharacterSwitcher characters={characters} activeId={activeCharacter?.id ?? null} />
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-stone-400 hover:text-stone-200"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
