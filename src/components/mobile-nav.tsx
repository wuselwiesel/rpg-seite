"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, BookOpen, Compass, Library, UserPlus, Search, Plus, Menu, X, Settings, Users, Newspaper, UserRound, MessageCircle, IdCard, History, Dices } from "lucide-react";
import { WorldSwitcher } from "./world-switcher";
import { ActiveCharacterMenu } from "./active-character-menu";
import { InstallAppButton } from "./install-app-button";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { CharacterAvatar } from "./character-avatar";
import { PresenceControl } from "./character-presence";
import { Wordmark } from "./wordmark";
import { MobileTabLink } from "./mobile-tab-link";
import { MobileChatsTab } from "./mobile-chats-tab";
import { MobileModeButton } from "./mode-switch";
import { useAppMode } from "@/components/mode-context";
import { startTour } from "@/lib/tour";
import { isImmersiveChatPath } from "@/lib/immersive-routes";
import type { AppNotification } from "@/lib/notifications";
import type { Character, Profile, World } from "@/lib/types";

function MobileCreateTab({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} data-tour="compose" className="flex flex-1 items-center justify-center py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-accent text-accent transition active:scale-90">
        <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

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
  unreadCounts,
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
  unreadCounts: Record<string, number>;
}) {
  const pathname = usePathname();
  // Das Menü gehört zu der Seite, auf der man es geöffnet hat: wechselt die Seite (auch über Links im Menü, z. B. „Welten verwalten“), geht es zu
  const [openAt, setOpenAt] = useState<string | null>(null);
  const moreOpen = openAt !== null && openAt === pathname;
  const setMoreOpen = (open: boolean) => setOpenAt(open ? pathname : null);
  const mode = useAppMode();

  if (isImmersiveChatPath(pathname)) return null;

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-app px-4 py-2.5 print:hidden lg:hidden">
        {pathname === "/" && (
          <Link href="/" aria-label="Wortwinkel" className="shrink-0">
            <Wordmark height={28} />
          </Link>
        )}
        <div className={pathname === "/" ? "flex min-w-0 flex-1 justify-end" : "min-w-0 flex-1"}>
          <ActiveCharacterMenu
            characters={characters}
            activeCharacter={activeCharacter}
            avatarOnly={pathname === "/"}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell
            userId={userId}
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
          <MobileModeButton />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Menü"
            // Das Menü gibt es nur oben (unten keinen zweiten „Mehr“-Knopf); hier setzt der Rundgang an
            data-tour="account-menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      <nav className="mobile-bottom-nav transform-gpu fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {mode === "redaktion" ? (
          <>
            <MobileTabLink
              href="/redaktion"
              icon={<Newspaper className="h-5 w-5" strokeWidth={2} />}
              label="Feed"
              exact
            />
            <MobileTabLink
              href="/redaktion/chat"
              icon={<MessageCircle className="h-5 w-5" strokeWidth={2} />}
              label="Chat"
            />
            <MobileCreateTab href="/redaktion/new" label="Neuer Beitrag" />
            <MobileTabLink
              href="/redaktion/verlauf"
              icon={<History className="h-5 w-5" strokeWidth={2} />}
              label="Verlauf"
            />
            <MobileTabLink
              href={`/redaktion/profil/${userId}`}
              icon={<UserRound className="h-5 w-5" strokeWidth={2} />}
              label="Profil"
            />
          </>
        ) : mode === "story" ? (
          <>
            <MobileTabLink href="/story" icon={<BookOpen className="h-5 w-5" strokeWidth={2} />} label="Story" />
            <MobileTabLink href="/wiki" icon={<Library className="h-5 w-5" strokeWidth={2} />} label="Wiki" />
            {pathname?.startsWith("/wiki") ? (
              <MobileCreateTab href="/wiki/new" label="Neuer Wiki-Eintrag" />
            ) : (
              <MobileCreateTab href="/story/new" label="Neue Story" />
            )}
            {activeCharacter && (
              <MobileTabLink
                href={`/characters/${activeCharacter.id}/chabo`}
                icon={<IdCard className="h-5 w-5" strokeWidth={2} />}
                label="ChaBo"
              />
            )}
            {activeCharacter && (
              <MobileTabLink
                href={`/characters/${activeCharacter.id}`}
                icon={<UserRound className="h-5 w-5" strokeWidth={2} />}
                label="Profil"
                exact
              />
            )}
          </>
        ) : (
          <>
            <MobileTabLink href="/" icon={<House className="h-[26px] w-[26px]" strokeWidth={2} />} label="Feed" exact showLabel={false} />
            <MobileTabLink href="/search" icon={<Search className="h-[26px] w-[26px]" strokeWidth={2} />} label="Suche" showLabel={false} />
            <MobileCreateTab href="/posts/new" label="Neuer Beitrag" />
            <MobileChatsTab userId={userId} myCharacterIds={myCharacterIds} initialUnreadCounts={unreadCounts} activeCharacterId={activeCharacter?.id ?? null} />
          </>
        )}
        {mode === "ingame" && activeCharacter && (
          <MobileTabLink
            href={`/characters/${activeCharacter.id}`}
            icon={<CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={28} />}
            label="Profil"
            showLabel={false}
          />
        )}
      </nav>

      <div
        role="presentation"
        onClick={() => setMoreOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          moreOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5 shadow-lg transition-[transform,visibility] duration-200 lg:hidden ${
          moreOpen ? "translate-y-0" : "invisible translate-y-full"
        }`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-lg text-fg">Menü</span>
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
            <div className="relative shrink-0">
              <Link href={`/characters/${activeCharacter.id}`} onClick={() => setMoreOpen(false)}>
                <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={48} />
              </Link>
              <PresenceControl characterId={activeCharacter.id} online={!!activeCharacter.presence_online} placement="bottom-right" />
            </div>
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
          </div>
        )}

        <div className="mb-4">
          <p className="mb-1 px-1 text-xs text-muted">Welt</p>
          <WorldSwitcher worlds={worlds} activeWorld={activeWorld} isOwner={isOwner} inline />
        </div>

        <div className="flex flex-col gap-1">
          <Link
            href="/story/wuerfe"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Dices className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Würfelverlauf
          </Link>
          {activeCharacter && (
            <Link
              href={`/characters/${activeCharacter.id}/chabo`}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <IdCard className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              ChaBo
            </Link>
          )}
          <Link
            href="/friends"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <UserPlus className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Freund:innen
          </Link>
          <Link
            href="/redaktion"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Newspaper className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Redaktion
          </Link>
          <Link
            href="/characters"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Charaktere verwalten
          </Link>
          <Link
            href="/profile"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Konto &amp; Einstellungen
          </Link>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              startTour();
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Compass className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            Rundgang starten
          </button>
          <div className="flex items-center justify-between rounded-xl px-3 py-1.5 text-[15px] font-medium text-fg-soft">
            Hell / Dunkel
            <ThemeToggle />
          </div>
          <InstallAppButton
            onDone={() => setMoreOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          />
        </div>
      </div>
    </>
  );
}
