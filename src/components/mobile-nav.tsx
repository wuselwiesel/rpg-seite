"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { WhoSwitcher } from "./who-switcher";
import type { OwnCharacterLite } from "@/lib/active-character";
import { NotificationBell } from "./notification-bell";
import { MobileTabLink } from "./mobile-tab-link";
import { MobileChatsTab } from "./mobile-chats-tab";
import { MobileCharacterTab } from "./mobile-character-tab";
import { CreateMenu } from "./create-menu";
import { NavIcon } from "./nav-icon";
import { SettingsSheet } from "./settings-sheet";
import { navItems } from "@/lib/nav-model";
import { useNotebook } from "./notebook-host";
import { MobileModeButton } from "./mode-switch";
import { useAppMode } from "@/components/mode-context";
import { isImmersiveChatPath } from "@/lib/immersive-routes";
import type { AppNotification } from "@/lib/notifications";
import type { Character, World } from "@/lib/types";

// Handy (Variante D): oben „Wer und wo“, Glocke, Notizbuch, Modus; unten zwei Einträge, „+ Erstellen“, zwei Einträge.
// Einstellungen und Seltenes liegen im Einstellungen-Bogen (≡ im eigenen Profil, „Du“ in der Redaktion).
export function MobileNav({
  worlds,
  activeWorld,
  canManage,
  appAdmin = false,
  ticketUnread = 0,
  altAccount = null,
  activeCharacter,
  characters,
  allCharacters,
  accountName,
  userId,
  initialNotifications,
  initialUnreadCount,
  worldFilter,
  myCharacterIds,
  unreadCounts,
}: {
  worlds: World[];
  activeWorld: World;
  canManage: boolean;
  appAdmin?: boolean;
  // Ungelesenes Feedback (Zahl am Tab „Feedback“)
  ticketUnread?: number;
  // Name des verknüpften zweiten Kontos (offizielles Wortwinkel-Konto) für den schnellen Wechsel
  altAccount?: string | null;
  activeCharacter: Character | null;
  // Eigene Charaktere der aktiven Welt („Erstellen als“)
  characters: Character[];
  // Eigene Charaktere aller Welten („Du spielst“)
  allCharacters: OwnCharacterLite[];
  // Name des Kontos (Kopf in der Redaktion)
  accountName: string;
  userId: string;
  initialNotifications: AppNotification[];
  initialUnreadCount: number;
  worldFilter: string | null;
  myCharacterIds: string[];
  unreadCounts: Record<string, number>;
}) {
  const pathname = usePathname();
  const mode = useAppMode();
  const notebook = useNotebook();

  if (isImmersiveChatPath(pathname)) return null;

  return (
    <>
      <div className="chrome sticky top-0 z-30 border-b border-line bg-app print:hidden lg:hidden">
        <div className="flex items-center gap-2 px-4 py-2 max-[359px]:px-2">
          {mode === "redaktion" ? (
            <Link href="/redaktion/du" className="min-w-0 flex-1">
              <span className="block font-serif text-[22px] leading-none text-fg">Redaktion</span>
              <span className="block truncate text-[11px] text-muted">als {accountName}</span>
            </Link>
          ) : (
            <WhoSwitcher variant="mobile" worlds={worlds} activeWorld={activeWorld} canManage={canManage} activeCharacter={activeCharacter} characters={allCharacters} />
          )}
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell
              key={`${activeWorld.id}-${worldFilter}`}
              userId={userId}
              activeWorldId={activeWorld.id}
              worldFilter={worldFilter}
              initialNotifications={initialNotifications}
              initialUnreadCount={initialUnreadCount}
            />
            <button
              type="button"
              onClick={() => notebook.open()}
              aria-label="Notizbuch"
              className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <NotebookPen className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
            <MobileModeButton />
          </div>
        </div>
      </div>

      <nav className="chrome mobile-bottom-nav transform-gpu fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {/* Zwei Einträge, „+ Erstellen“ in der Mitte, zwei Einträge (lib/nav-model.ts) */}
        {navItems(mode, { activeCharacter }).map((item, i) => (
          <Fragment key={item.id}>
            {i === 2 && <CreateMenu variant="mobile" characters={characters} activeId={activeCharacter?.id ?? null} />}
            {item.badge === "chats" ? (
              <MobileChatsTab userId={userId} myCharacterIds={myCharacterIds} initialUnreadCounts={unreadCounts} activeCharacterId={activeCharacter?.id ?? null} />
            ) : item.icon === "character" ? (
              <MobileCharacterTab href={item.href} label={item.label} avatar={activeCharacter ? { name: activeCharacter.name, url: activeCharacter.avatar_url } : null} />
            ) : (
              <MobileTabLink
                href={item.href}
                exact={item.exact}
                also={item.also}
                exclude={item.exclude}
                badge={item.badge === "tickets" ? ticketUnread : 0}
                icon={<NavIcon icon={item.icon} className="h-5 w-5" />}
                label={item.label}
              />
            )}
          </Fragment>
        ))}
      </nav>

      <SettingsSheet appAdmin={appAdmin} altAccount={altAccount} />
    </>
  );
}
