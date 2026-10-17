"use client";

import { SwitchAccountButton } from "./switch-account-button";
import { chaboLabel } from "@/lib/chabo-label";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CircleHelp, House, BookOpen, Compass, Library, UserPlus, Search, Plus, Menu, X, Settings, Users, Newspaper, UserRound, MessageCircle, IdCard, History, Dices, Inbox, type LucideIcon } from "lucide-react";
import { WorldSwitcher } from "./world-switcher";
import { MobileWorldPicker } from "./mobile-world-picker";
import { MenuCharacterCard } from "./menu-character-card";
import { InstallAppButton } from "./install-app-button";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { CharacterAvatar } from "./character-avatar";
import { MobileTabLink } from "./mobile-tab-link";
import { MobileChatsTab } from "./mobile-chats-tab";
import { MobileModeButton } from "./mode-switch";
import { MobileOnline } from "./mobile-online";
import type { OnlineMember } from "./online-list";
import { useAppMode } from "@/components/mode-context";
import { startTour } from "@/lib/tour";
import { isImmersiveChatPath } from "@/lib/immersive-routes";
import { useDiceEnabled } from "./dice-context";
import { useWorldRights } from "./rights-context";
import type { AppNotification } from "@/lib/notifications";
import type { Character, Profile, World } from "@/lib/types";

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1 px-3 text-xs font-medium text-muted">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function MenuLink({ href, icon: Icon, onNavigate, children, badge }: { href: string; icon: LucideIcon; onNavigate: () => void; children: React.ReactNode; badge?: number }) {
  return (
    <Link href={href} onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg">
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {children}
      {badge ? (
        <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent-strong" aria-label={`${badge} ungelesen`}>
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileCreateTab({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} data-tour="compose" className="flex flex-1 items-center justify-center py-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-strong text-on-accent-strong shadow-sm transition active:scale-90">
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

export function MobileNav({
  worlds,
  activeWorld,
  canManage,
  appAdmin = false,
  ticketUnread = 0,
  altAccount = null,
  activeCharacter,
  characters,
  profile,
  userId,
  initialNotifications,
  initialUnreadCount,
  worldFilter,
  myCharacterIds,
  unreadCounts,
  worldMembers,
}: {
  worlds: World[];
  activeWorld: World;
  canManage: boolean;
  appAdmin?: boolean;
  // Ungelesene Tickets (Zahl am Menüeintrag „Tickets“)
  ticketUnread?: number;
  // Name des verknüpften zweiten Kontos (offizielles Wortwinkel-Konto) für den schnellen Wechsel
  altAccount?: string | null;
  activeCharacter: Character | null;
  characters: Character[];
  profile: Profile | null | undefined;
  userId: string;
  initialNotifications: AppNotification[];
  initialUnreadCount: number;
  worldFilter: string | null;
  myCharacterIds: string[];
  unreadCounts: Record<string, number>;
  worldMembers: OnlineMember[];
}) {
  const pathname = usePathname();
  const diceEnabled = useDiceEnabled();
  const rights = useWorldRights();
  // Das Menü gehört zu der Seite, auf der man es geöffnet hat: wechselt die Seite (auch über Links im Menü, z. B. „Welten verwalten“), geht es zu
  const [openAt, setOpenAt] = useState<string | null>(null);
  const moreOpen = openAt !== null && openAt === pathname;
  const setMoreOpen = (open: boolean) => setOpenAt(open ? pathname : null);
  const mode = useAppMode();

  useEffect(() => {
    const root = document.documentElement;
    if (moreOpen) root.setAttribute("data-menu-open", "");
    else root.removeAttribute("data-menu-open");
    return () => root.removeAttribute("data-menu-open");
  }, [moreOpen]);

  if (isImmersiveChatPath(pathname)) return null;

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-line bg-app print:hidden lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2 max-[359px]:px-2">
        {/* Links die Welt (ein Tipp wechselt sie); rechts Glocke, Bereich und Menü. Suche, Mitglieder und Charakterwechsel liegen im Menü. */}
        <MobileWorldPicker worlds={worlds} activeWorld={activeWorld} />
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell
            key={`${activeWorld.id}-${worldFilter}`}
            userId={userId}
            activeWorldId={activeWorld.id}
            worldFilter={worldFilter}
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
              rights.wikiCreate && <MobileCreateTab href="/wiki/new" label="Neuer Wiki-Eintrag" />
            ) : (
              rights.storyCreate && <MobileCreateTab href="/story/new" label="Neue Story" />
            )}
            {activeCharacter && (
              <MobileTabLink
                href={`/characters/${activeCharacter.id}/chabo`}
                icon={<IdCard className="h-5 w-5" strokeWidth={2} />}
                label={chaboLabel(diceEnabled)}
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
            <MobileTabLink href="/" icon={<House className="h-5 w-5" strokeWidth={2} />} label="Feed" exact />
            {activeCharacter ? (
              <MobileTabLink
                href={`/characters/${activeCharacter.id}/chabo`}
                icon={<IdCard className="h-5 w-5" strokeWidth={2} />}
                label={chaboLabel(diceEnabled)}
              />
            ) : (
              <MobileTabLink href="/search" icon={<Search className="h-5 w-5" strokeWidth={2} />} label="Suche" />
            )}
            <MobileCreateTab href="/posts/new" label="Neuer Beitrag" />
            <MobileChatsTab userId={userId} myCharacterIds={myCharacterIds} initialUnreadCounts={unreadCounts} activeCharacterId={activeCharacter?.id ?? null} />
          </>
        )}
        {mode === "ingame" && activeCharacter && (
          <MobileTabLink
            href={`/characters/${activeCharacter.id}`}
            icon={<CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={22} />}
            label="Profil"
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
            aria-label="Menü schließen"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <Link
          href="/search"
          onClick={() => setMoreOpen(false)}
          className="mb-4 flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-muted transition hover:text-fg"
        >
          <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          Suchen
        </Link>

        <MenuCharacterCard characters={characters} activeCharacter={activeCharacter} profile={profile} onNavigate={() => setMoreOpen(false)} />

        <div className="flex flex-col gap-4">
          <MenuSection title="Welt">
            <WorldSwitcher worlds={worlds} activeWorld={activeWorld} canManage={canManage} inline />
            <MobileOnline members={worldMembers} selfId={userId} variant="row" onOpen={() => setMoreOpen(false)} />
            {diceEnabled && (
              <MenuLink href="/story/wuerfe" icon={Dices} onNavigate={() => setMoreOpen(false)}>
                Würfelverlauf
              </MenuLink>
            )}
          </MenuSection>

          <MenuSection title="Du">
            {activeCharacter && (
              <MenuLink href={`/characters/${activeCharacter.id}/chabo`} icon={IdCard} onNavigate={() => setMoreOpen(false)}>
                {chaboLabel(diceEnabled)}
              </MenuLink>
            )}
            <MenuLink href="/characters" icon={Users} onNavigate={() => setMoreOpen(false)}>
              Meine Charaktere
            </MenuLink>
            <MenuLink href="/friends" icon={UserPlus} onNavigate={() => setMoreOpen(false)}>
              Freund:innen
            </MenuLink>
            <MenuLink href="/redaktion/tickets" icon={Inbox} onNavigate={() => setMoreOpen(false)} badge={ticketUnread}>
              Tickets
            </MenuLink>
            {appAdmin && (
              <MenuLink href="/redaktion/ueberblick" icon={BarChart3} onNavigate={() => setMoreOpen(false)}>
                Überblick
              </MenuLink>
            )}
          </MenuSection>

          <MenuSection title="App">
            <MenuLink href="/profile" icon={Settings} onNavigate={() => setMoreOpen(false)}>
              Konto &amp; Einstellungen
            </MenuLink>
            {altAccount && (
              <SwitchAccountButton
                label={altAccount}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
              />
            )}
            <MenuLink href="/hilfe" icon={CircleHelp} onNavigate={() => setMoreOpen(false)}>
              Hilfe
            </MenuLink>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                startTour();
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Compass className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              Rundgänge
            </button>
            <div className="flex items-center justify-between rounded-xl px-3 py-1.5 text-[15px] font-medium text-fg-soft">
              Hell / Dunkel
              <ThemeToggle />
            </div>
            <InstallAppButton
              onDone={() => setMoreOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            />
          </MenuSection>
        </div>
      </div>
    </>
  );
}
