"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellOff } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { OnlineDot } from "@/components/online-status";
import { chatTime } from "@/lib/chat-preview";

export function ChatListItem({
  id,
  title,
  avatarUrl,
  ownerId,
  participantCount,
  lastMessage = null,
  unreadCount,
  muted = false,
}: {
  id: string;
  title: string;
  avatarUrl: string | null | undefined;
  // Account der Gegenseite bei einem Zweier-Chat (für den Online-Punkt)
  ownerId?: string | null;
  participantCount: number;
  lastMessage?: { text: string; at: string; sender: string | null } | null;
  unreadCount: number;
  muted?: boolean;
}) {
  const active = usePathname() === `/chats/${id}`;
  const unread = unreadCount > 0 && !active;

  return (
    <Link
      href={`/chats/${id}`}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition active:bg-surface-3 ${
        active ? "bg-surface-2" : "hover:bg-surface-2/60"
      }`}
    >
      <span className="relative shrink-0">
        <CharacterAvatar name={title} avatarUrl={avatarUrl} size={52} />
        <OnlineDot userId={ownerId} overlay />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={`min-w-0 flex-1 truncate text-[15px] text-fg ${unread ? "font-semibold" : "font-medium"}`}>{title}</p>
          {lastMessage && (
            <time
              dateTime={lastMessage.at}
              suppressHydrationWarning
              className={`shrink-0 text-xs ${unread ? "font-medium text-accent" : "text-muted"}`}
            >
              {chatTime(lastMessage.at)}
            </time>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-medium text-fg" : "text-muted"}`}>
            {lastMessage
              ? `${lastMessage.sender ? `${lastMessage.sender}: ` : ""}${lastMessage.text}`
              : `${participantCount} Teilnehmer:innen`}
          </p>
          {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-label="Stumm geschaltet" />}
          {unread && (
            <span
              className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                muted ? "bg-surface-3 text-fg-soft" : "bg-accent-strong text-on-accent-strong"
              }`}
              aria-label={`${unreadCount} ungelesen`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
