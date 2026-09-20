"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellOff } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";

export function ChatListItem({
  id,
  title,
  avatarUrl,
  participantCount,
  unread,
  muted = false,
}: {
  id: string;
  title: string;
  avatarUrl: string | null | undefined;
  participantCount: number;
  unread: boolean;
  muted?: boolean;
}) {
  const active = usePathname() === `/chats/${id}`;

  return (
    <Link
      href={`/chats/${id}`}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
        active ? "bg-surface-2" : "hover:bg-surface-2/60"
      }`}
    >
      <CharacterAvatar name={title} avatarUrl={avatarUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm text-fg ${unread && !active ? "font-semibold" : "font-medium"}`}>{title}</p>
        <p className="truncate text-xs text-muted">{participantCount} Teilnehmer:innen</p>
      </div>
      {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-label="Stumm geschaltet" />}
      {unread && !active && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-strong" />}
    </Link>
  );
}
