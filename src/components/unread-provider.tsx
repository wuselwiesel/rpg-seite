"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUnreadChatIds } from "@/lib/use-unread-chats";

type Unread = {
  // Ungelesene Nachrichten je eigener Figur (alle Welten)
  perCharacter: Record<string, number>;
  // Aus Sicht der aktiven Figur (wie die Chatliste) und alle eigenen Figuren zusammen
  total: number;
  allTotal: number;
  activeCharacterId: string | null;
};

const UnreadContext = createContext<Unread>({ perCharacter: {}, total: 0, allTotal: 0, activeCharacterId: null });

// Eine gemeinsame Live-Zählung für Seitenleiste, Kopfzeile und Reiterleiste (statt je einer eigenen Abfrage)
export function UnreadProvider({
  userId,
  characterIds,
  activeCharacterId,
  initialCounts,
  initialPerCharacter,
  children,
}: {
  userId: string;
  characterIds: string[];
  activeCharacterId: string | null;
  initialCounts: Record<string, number>;
  initialPerCharacter: Record<string, number>;
  children: ReactNode;
}) {
  const { total, allTotal, perCharacter } = useUnreadChatIds(userId, characterIds, initialCounts, activeCharacterId, initialPerCharacter);
  return <UnreadContext.Provider value={{ perCharacter, total, allTotal, activeCharacterId }}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}

// Ungelesen-Zahl als kleine Marke; ab 100 „99+“
export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span aria-label={`${count} ungelesen`} className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-strong px-1.5 text-[11px] font-semibold leading-none text-on-accent-strong ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
