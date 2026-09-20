import Link from "next/link";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters, getActiveCharacter } from "@/lib/active-character";
import { getUserWorlds, getActiveWorld } from "@/lib/worlds";
import { getUnreadCounts } from "@/lib/chat-reads";
import { getRecentNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import type { Profile } from "@/lib/types";
import { CharacterSwitcher } from "./character-switcher";
import { WorldSwitcher } from "./world-switcher";
import { ModeSwitch } from "./mode-switch";
import { SidebarNav } from "./sidebar-nav";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { SidebarMenu } from "./sidebar-menu";
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
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-app px-4 py-2.5 print:hidden lg:hidden">
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
  const unreadCounts = await getUnreadCounts(user.id, myCharacterIds);
  const isOwner = activeWorld.created_by === user.id;

  return (
    <>
      <aside className="hidden h-dvh w-72 shrink-0 flex-col border-r border-line px-5 py-5 lg:sticky lg:top-0 lg:z-40 lg:flex">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <Link href="/" className="block shrink-0" aria-label="Wortwinkel">
            <Wordmark height={40} />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell
              userId={user.id}
              initialNotifications={initialNotifications}
              initialUnreadCount={initialUnreadCount}
            />
            <ThemeToggle />
            <SidebarMenu />
          </div>
        </div>
      <div className="mb-3">
        <WorldSwitcher worlds={worlds} activeWorld={activeWorld} isOwner={isOwner} />
      </div>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
      <div className="mb-4">
        <ModeSwitch />
      </div>

      {activeCharacter && characters.length > 1 && (
        <div className="mb-4">
          <CharacterSwitcher characters={characters} activeId={activeCharacter.id} className="w-full" />
        </div>
      )}

      <SidebarNav
        userId={user.id}
        myCharacterIds={myCharacterIds}
        unreadCounts={unreadCounts}
      />
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
      unreadCounts={unreadCounts}
    />
    </>
  );
}
