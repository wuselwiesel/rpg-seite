import Link from "next/link";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters, getActiveCharacter } from "@/lib/active-character";
import { getUserWorlds, getActiveWorld } from "@/lib/worlds";
import { getUnreadChatIds } from "@/lib/chat-reads";
import { getRecentNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import type { Profile } from "@/lib/types";
import { CharacterAvatar } from "./character-avatar";
import { CharacterSwitcher } from "./character-switcher";
import { WorldSwitcher } from "./world-switcher";
import { ModeSwitch } from "./mode-switch";
import { SidebarNav } from "./sidebar-nav";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { Wordmark } from "./wordmark";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [worlds, profileResult] = await Promise.all([
    getUserWorlds(user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
  ]);
  const profile = profileResult.data;

  const activeWorld = await getActiveWorld(user.id);

  const [initialNotifications, initialUnreadCount] = await Promise.all([
    getRecentNotifications(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  if (!activeWorld) {
    return (
      <>
        <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-line px-5 py-6 lg:sticky lg:top-0 lg:flex">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/worlds" className="block">
              <Wordmark height={48} />
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell
                userId={user.id}
                initialNotifications={initialNotifications}
                initialUnreadCount={initialUnreadCount}
              />
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between pt-6">
            <Link href="/profile" className="text-sm text-muted hover:text-fg">
              Profil
            </Link>
          </div>
        </aside>
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-app px-4 py-2.5 lg:hidden">
          <Link href="/worlds" className="block">
            <Wordmark height={34} />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell
              userId={user.id}
              initialNotifications={initialNotifications}
              initialUnreadCount={initialUnreadCount}
            />
            <ThemeToggle />
            <Link
              href="/profile"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              title="Profil"
            >
              <UserRound className="h-[18px] w-[18px]" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </>
    );
  }

  const [characters, activeCharacter] = await Promise.all([
    getOwnCharacters(user.id, activeWorld.id),
    getActiveCharacter(user.id, activeWorld.id),
  ]);

  const myCharacterIds = characters.map((c) => c.id);
  const unreadChatIds = await getUnreadChatIds(user.id, myCharacterIds);
  const isOwner = activeWorld.created_by === user.id;

  return (
    <>
      <aside className="hidden h-dvh w-72 shrink-0 flex-col border-r border-line px-5 py-5 lg:sticky lg:top-0 lg:flex">
        <div className="mb-2 flex items-center justify-end gap-1">
        <NotificationBell
          userId={user.id}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
        <ThemeToggle />
      </div>
      <div className="mb-3">
        <WorldSwitcher worlds={worlds} activeWorld={activeWorld} isOwner={isOwner} />
      </div>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
      <div className="mb-4">
        <ModeSwitch />
      </div>

      {activeCharacter && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-surface-2 p-3">
          <div className="flex items-center gap-3">
            <Link href={`/characters/${activeCharacter.id}`} className="shrink-0">
              <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={48} />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/characters/${activeCharacter.id}`}
                className="block truncate font-serif text-lg leading-tight text-fg hover:text-accent"
              >
                {activeCharacter.name}
              </Link>
              {(activeCharacter.username || profile?.username) && (
                <Link href="/profile" className="block truncate text-xs text-muted hover:text-accent">
                  @{activeCharacter.username ?? profile?.nickname ?? profile?.username}
                </Link>
              )}
            </div>
          </div>
          {characters.length > 1 && (
            <CharacterSwitcher characters={characters} activeId={activeCharacter.id} className="w-full" />
          )}
        </div>
      )}

      <SidebarNav userId={user.id} myCharacterIds={myCharacterIds} unreadChatIds={unreadChatIds} />
      </div>
    </aside>
    <MobileNav
      worlds={worlds}
      activeWorld={activeWorld}
      isOwner={isOwner}
      activeCharacter={activeCharacter}
      characters={characters}
      profile={profile}
      userId={user.id}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
      myCharacterIds={myCharacterIds}
      unreadChatIds={unreadChatIds}
    />
    </>
  );
}
