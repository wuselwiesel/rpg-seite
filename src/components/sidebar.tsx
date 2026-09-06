import Link from "next/link";
import { ScrollText, Users, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters, getActiveCharacter } from "@/lib/active-character";
import { getUnreadChatIds } from "@/lib/chat-reads";
import { CharacterAvatar } from "./character-avatar";
import { CharacterSwitcher } from "./character-switcher";
import { NavLink } from "./nav-link";
import { ChatsNavLink } from "./chats-nav-link";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/lib/actions/auth";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [characters, activeCharacter, profile] = await Promise.all([
    getOwnCharacters(user.id),
    getActiveCharacter(user.id),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);

  const myCharacterIds = characters.map((c) => c.id);
  const unreadChatIds = await getUnreadChatIds(user.id, myCharacterIds);

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-line px-5 py-6">
      <Link href="/" className="mb-8 block px-1">
        <span className="font-serif text-2xl text-fg">Chronik</span>
      </Link>

      {activeCharacter && (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl bg-surface-2 px-4 py-6 text-center">
          <CharacterAvatar
            name={activeCharacter.name}
            avatarUrl={activeCharacter.avatar_url}
            size={72}
          />
          <div>
            <p className="font-serif text-xl text-fg">{activeCharacter.name}</p>
            {profile.data?.username && (
              <p className="text-sm text-muted">@{profile.data.username}</p>
            )}
          </div>
          <CharacterSwitcher characters={characters} activeId={activeCharacter.id} />
        </div>
      )}

      <nav className="flex flex-col gap-1">
        <NavLink href="/" icon={<ScrollText className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />} exact>
          Feed
        </NavLink>
        <ChatsNavLink
          userId={user.id}
          myCharacterIds={myCharacterIds}
          initialUnreadChatIds={unreadChatIds}
        />
        <NavLink href="/characters" icon={<Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}>
          Charaktere
        </NavLink>
      </nav>

      <Link
        href="/posts/new"
        className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
        Neuer Eintrag
      </Link>

      <div className="mt-auto flex items-center justify-between pt-6">
        <form action={logout}>
          <button type="submit" className="text-sm text-muted hover:text-fg">
            Abmelden
          </button>
        </form>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
