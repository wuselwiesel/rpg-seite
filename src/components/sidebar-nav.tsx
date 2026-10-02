"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, BookOpen, Library, Network, PenLine, UserRound, Newspaper } from "lucide-react";
import { getAppMode } from "@/lib/app-mode";
import { NavLink } from "./nav-link";
import { ChatsNavLink } from "./chats-nav-link";
import type { Character } from "@/lib/types";

const ICON = "h-[18px] w-[18px] shrink-0";

export function SidebarNav({
  userId,
  myCharacterIds,
  unreadCounts,
  activeCharacter,
}: {
  userId: string;
  myCharacterIds: string[];
  unreadCounts: Record<string, number>;
  activeCharacter: Character | null;
}) {
  const pathname = usePathname();
  const mode = getAppMode(pathname);
  const inWiki = pathname?.startsWith("/wiki");

  if (mode === "redaktion") {
    return (
      <>
        <nav className="flex flex-col gap-1">
          <NavLink href="/redaktion" icon={<Newspaper className={ICON} strokeWidth={2} />} exact>
            Redaktion-Feed
          </NavLink>
          <NavLink href={`/redaktion/profil/${userId}`} icon={<UserRound className={ICON} strokeWidth={2} />}>
            Profil
          </NavLink>
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
          <NavLink href="/story" icon={<BookOpen className={ICON} strokeWidth={2} />}>
            Story
          </NavLink>
          <NavLink href="/wiki" icon={<Library className={ICON} strokeWidth={2} />}>
            Wiki
          </NavLink>
          <NavLink href="/characters/relationships" icon={<Network className={ICON} strokeWidth={2} />}>
            Beziehungen
          </NavLink>
          {activeCharacter && (
            <NavLink href={`/characters/${activeCharacter.id}`} icon={<UserRound className={ICON} strokeWidth={2} />}>
              Profil
            </NavLink>
          )}
        </nav>
        <Link
          href={inWiki ? "/wiki/new" : "/story/new"}
          data-tour="compose"
          className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-[15px] font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <PenLine className="h-[18px] w-[18px]" strokeWidth={2} />
          {inWiki ? "Neuer Wiki-Eintrag" : "Neue Story"}
        </Link>
      </>
    );
  }

  return (
    <>
      <nav className="flex flex-col gap-1">
        <NavLink href="/" icon={<House className={ICON} strokeWidth={2} />} exact>
          Feed
        </NavLink>
        <NavLink href="/search" icon={<Search className={ICON} strokeWidth={2} />}>
          Suche
        </NavLink>
        <ChatsNavLink userId={userId} myCharacterIds={myCharacterIds} initialUnreadCounts={unreadCounts} />
        {activeCharacter && (
          <NavLink href={`/characters/${activeCharacter.id}`} icon={<UserRound className={ICON} strokeWidth={2} />}>
            Profil
          </NavLink>
        )}
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
