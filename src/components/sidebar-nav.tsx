"use client";

import { NotebookPen } from "lucide-react";
import { useAppMode } from "@/components/mode-context";
import { navItems } from "@/lib/nav-model";
import { NavLink } from "./nav-link";
import { NavIcon } from "./nav-icon";
import { ChatsNavLink } from "./chats-nav-link";
import { CreateMenu } from "./create-menu";
import { useNotebook } from "./notebook-host";
import type { Character } from "@/lib/types";

const ICON = "h-[18px] w-[18px] shrink-0";

// Einträge der Seitenleiste aus derselben Quelle wie die Handy-Leiste (lib/nav-model.ts), dazu „Notizen“ und „+ Erstellen“.
export function SidebarNav({
  userId,
  myCharacterIds,
  unreadCounts,
  activeCharacter,
  characters,
  ticketUnread = 0,
}: {
  userId: string;
  myCharacterIds: string[];
  unreadCounts: Record<string, number>;
  activeCharacter: Character | null;
  // Eigene Charaktere der aktiven Welt („Erstellen als“)
  characters: Character[];
  // Ungelesene Tickets (Zahl am Eintrag „Feedback“)
  ticketUnread?: number;
}) {
  const mode = useAppMode();
  const notebook = useNotebook();
  const items = navItems(mode, { activeCharacter });

  return (
    <>
      <nav className="flex flex-col gap-1">
        {items.map((item) =>
          item.badge === "chats" ? (
            <ChatsNavLink key={item.id} userId={userId} myCharacterIds={myCharacterIds} initialUnreadCounts={unreadCounts} activeCharacterId={activeCharacter?.id ?? null} />
          ) : (
            <NavLink
              key={item.id}
              href={item.href}
              exact={item.exact}
              also={item.also}
              exclude={item.exclude}
              badge={item.badge === "tickets" ? ticketUnread : undefined}
              icon={<NavIcon icon={item.icon} className={ICON} avatar={activeCharacter ? { name: activeCharacter.name, url: activeCharacter.avatar_url } : null} avatarSize={20} />}
            >
              {item.id === "character" && activeCharacter ? activeCharacter.name : item.label}
            </NavLink>
          ),
        )}
        <button
          type="button"
          onClick={() => notebook.open()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        >
          <NotebookPen className={ICON} strokeWidth={2} />
          Notizen
        </button>
      </nav>
      <CreateMenu variant="sidebar" characters={characters} activeId={activeCharacter?.id ?? null} />
    </>
  );
}
