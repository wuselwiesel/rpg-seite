"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CharacterAvatar } from "@/components/character-avatar";

export function ChatListItem({
  id,
  title,
  avatarUrl,
  isGroup,
  participantCount,
  unread,
}: {
  id: string;
  title: string;
  avatarUrl: string | null | undefined;
  isGroup: boolean;
  participantCount: number;
  unread: boolean;
}) {
  const active = usePathname() === `/chats/${id}`;

  return (
    <Link
      href={`/chats/${id}`}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
        active ? "bg-surface-2" : "hover:bg-surface-2/60"
      }`}
    >
      {isGroup ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-fg">#</div>
      ) : (
        <CharacterAvatar name={title} avatarUrl={avatarUrl} size={44} />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm text-fg ${unread && !active ? "font-semibold" : "font-medium"}`}>{title}</p>
        <p className="truncate text-xs text-muted">{participantCount} Teilnehmer:innen</p>
      </div>
      {unread && !active && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-strong" />}
    </Link>
  );
}
