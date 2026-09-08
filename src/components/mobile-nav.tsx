"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollText, BookOpen, Library, Users, UserPlus, Search, PenLine, Menu, X } from "lucide-react";
import { WorldSwitcher } from "./world-switcher";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { CharacterAvatar } from "./character-avatar";
import { CharacterSwitcher } from "./character-switcher";
import { MobileTabLink } from "./mobile-tab-link";
import { MobileChatsTab } from "./mobile-chats-tab";
import { isImmersiveChatPath } from "@/lib/immersive-routes";
import type { AppNotification } from "@/lib/notifications";
import type { Character, Profile, World } from "@/lib/types";

export function MobileNav({
  worlds,
  activeWorld,
  isOwner,
  activeCharacter,
  characters,
  profile,
  userId,
  initialNotifications,
  initialUnreadCount,
  myCharacterIds,
  unreadChatIds,
}: {
  worlds: World[];
  activeWorld: World;
  isOwner: boolean;
  activeCharacter: Character | null;
  characters: Character[];
  profile: Profile | null | undefined;
  userId: string;
  initialNotifications: AppNotification[];
  initialUnreadCount: number;
  myCharacterIds: string[];
  unreadChatIds: string[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  if (isImmersiveChatPath(pathname)) return null;

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-app px-4 py-2.5 lg:hidden">
        <div className="min-w-0 flex-1">
          <WorldSwitcher worlds={worlds} activeWorld={activeWorld} isOwner={isOwner} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell
            userId={userId}
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
          <ThemeToggle />
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <MobileTabLink href="/" icon={<ScrollText className="h-5 w-5" strokeWidth={2} />} label="Feed" exact />
        <MobileTabLink href="/story" icon={<BookOpen className="h-5 w-5" strokeWidth={2} />} label="Story" />
        <MobileChatsTab userId={userId} myCharacterIds={myCharacterIds} initialUnreadChatIds={unreadChatIds} />
        <MobileTabLink
          href="/characters"
          icon={<Users className="h-5 w-5" strokeWidth={2} />}
          label="Charaktere"
        />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted transition hover:text-fg-soft"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          Mehr
        </button>
      </nav>

      <div
        role="presentation"
        onClick={() => setMoreOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          moreOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-line bg-surface p-5 shadow-lg transition-transform duration-200 lg:hidden ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-lg text-fg">Mehr</span>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {activeCharacter && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <Link href={`/characters/${activeCharacter.id}`} onClick={() => setMoreOpen(false)}>
              <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={48} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/characters/${activeCharacter.id}`}
                onClick={() => setMoreOpen(false)}
                className="block truncate font-serif text-lg text-fg hover:text-accent"
              >
                {activeCharacter.name}
              </Link>
              {profile?.username && (
                <Link
                  href="/profile"
                  onClick={() => setMoreOpen(false)}
                  className="block text-xs text-muted hover:text-accent"
                >
                  @{profile.nickname || profile.username}
                </Link>
              )}
            </div>
            {characters.length > 1 && (
              <CharacterSwitcher characters={characters} activeId={activeCharacter.id} className="max-w-[7.5rem]" />
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Link
            href="/friends"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <UserPlus className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Freund:innen
          </Link>
          <Link
            href="/wiki"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Library className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Wiki
          </Link>
          <Link
            href="/search"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Suche
          </Link>
          <Link
            href="/profile"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            Profil &amp; Einstellungen
          </Link>
        </div>

        <Link
          href="/posts/new"
          onClick={() => setMoreOpen(false)}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
          Neuer Feed-Eintrag
        </Link>
      </div>
    </>
  );
}
