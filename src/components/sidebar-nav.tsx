"use client";

import { chaboLabel } from "@/lib/chabo-label";
import { useDiceEnabled } from "./dice-context";
import { useWorldRights } from "./rights-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, House, Search, BookOpen, Library, PenLine, UserRound, Newspaper, MessageCircle, IdCard, History, Dices, Inbox } from "lucide-react";
import { useAppMode } from "@/components/mode-context";
import { NavLink } from "./nav-link";
import { ChatsNavLink } from "./chats-nav-link";
import type { Character } from "@/lib/types";

const ICON = "h-[18px] w-[18px] shrink-0";

export function SidebarNav({
  userId,
  myCharacterIds,
  unreadCounts,
  activeCharacter,
  appAdmin = false,
  ticketUnread = 0,
}: {
  userId: string;
  myCharacterIds: string[];
  unreadCounts: Record<string, number>;
  activeCharacter: Character | null;
  // App-Admins sehen in der Redaktion zusätzlich den Überblick
  appAdmin?: boolean;
  // Ungelesene Tickets (Zahl am Eintrag „Tickets“)
  ticketUnread?: number;
}) {
  const pathname = usePathname();
  const mode = useAppMode();
  const diceEnabled = useDiceEnabled();
  const rights = useWorldRights();
  const inWiki = pathname?.startsWith("/wiki") || pathname?.startsWith("/characters/relationships");

  if (mode === "redaktion") {
    return (
      <>
        <nav className="flex flex-col gap-1">
          <NavLink href="/redaktion" icon={<Newspaper className={ICON} strokeWidth={2} />} exact>
            Redaktion-Feed
          </NavLink>
          <NavLink href="/redaktion/chat" icon={<MessageCircle className={ICON} strokeWidth={2} />}>
            Chat
          </NavLink>
          <NavLink href="/redaktion/tickets" icon={<Inbox className={ICON} strokeWidth={2} />} badge={ticketUnread}>
            Tickets
          </NavLink>
          <NavLink href="/redaktion/verlauf" icon={<History className={ICON} strokeWidth={2} />}>
            Verlauf
          </NavLink>
          <NavLink href={`/redaktion/profil/${userId}`} icon={<UserRound className={ICON} strokeWidth={2} />}>
            Profil
          </NavLink>
          {appAdmin && (
            <NavLink href="/redaktion/ueberblick" icon={<BarChart3 className={ICON} strokeWidth={2} />}>
              Überblick
            </NavLink>
          )}
        </nav>
        <Link
          href="/redaktion/new"
          data-tour="compose"
          className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
          Neuer Beitrag
        </Link>
      </>
    );
  }

  if (mode === "story") {
    return (
      <>
        <nav className="flex flex-col gap-1">
          <NavLink href="/story" icon={<BookOpen className={ICON} strokeWidth={2} />} exclude={["/story/wuerfe", "/story/charaktere"]}>
            Story
          </NavLink>
          <NavLink href="/story/charaktere" icon={<Users className={ICON} strokeWidth={2} />}>
            Charaktere
          </NavLink>
          <NavLink href="/wiki" icon={<Library className={ICON} strokeWidth={2} />} also={["/characters/relationships"]}>
            Wiki
          </NavLink>
          {diceEnabled && (
            <NavLink href="/story/wuerfe" icon={<Dices className={ICON} strokeWidth={2} />}>
              Würfelverlauf
            </NavLink>
          )}
          {activeCharacter && (
            <NavLink href={`/characters/${activeCharacter.id}/chabo`} icon={<IdCard className={ICON} strokeWidth={2} />}>
              {chaboLabel(diceEnabled)}
            </NavLink>
          )}
        </nav>
        {(inWiki ? rights.wikiCreate : rights.storyCreate) && (
          <Link
            href={inWiki ? "/wiki/new" : "/story/new"}
            data-tour="compose"
            className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
          >
            <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
            {inWiki ? "Neuer Wiki-Eintrag" : "Neue Story"}
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      <nav className="flex flex-col gap-1">
        <NavLink href="/" icon={<House className={ICON} strokeWidth={2} />} exact>
          Feed
        </NavLink>
        {activeCharacter ? (
          <NavLink href={`/characters/${activeCharacter.id}/chabo`} icon={<IdCard className={ICON} strokeWidth={2} />}>
            {chaboLabel(diceEnabled)}
          </NavLink>
        ) : (
          <NavLink href="/search" icon={<Search className={ICON} strokeWidth={2} />}>
            Suche
          </NavLink>
        )}
        <ChatsNavLink userId={userId} myCharacterIds={myCharacterIds} initialUnreadCounts={unreadCounts} activeCharacterId={activeCharacter?.id ?? null} />
      </nav>
      <Link
        href="/posts/new"
        data-tour="compose"
        className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
        Neuer Beitrag
      </Link>
    </>
  );
}
