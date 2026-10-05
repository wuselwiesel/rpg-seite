"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellOff, Globe2 } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { OnlineDot } from "@/components/online-status";
import { chatTime } from "@/lib/chat-preview";

export function AccountChatListItem({
  id,
  title,
  kind = "direct",
  avatarUrl,
  partnerId,
  lastMessage,
  unread,
  muted,
}: {
  id: string;
  title: string;
  kind?: "direct" | "group" | "world";
  avatarUrl: string | null | undefined;
  partnerId?: string | null;
  lastMessage: { text: string; at: string; mine: boolean } | null;
  unread: number;
  muted: boolean;
}) {
  const href = `/redaktion/chat/${id}`;
  const active = usePathname() === href;
  const hasUnread = unread > 0 && !active;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition active:bg-surface-3 ${
        active ? "bg-surface-2" : "hover:bg-surface-2/60"
      }`}
    >
      <span className="relative shrink-0">
        <CharacterAvatar name={title} avatarUrl={avatarUrl} size={52} />
        <OnlineDot userId={partnerId} overlay />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={`min-w-0 flex-1 truncate text-[15px] text-fg ${hasUnread ? "font-semibold" : "font-medium"}`}>{kind === "world" && <Globe2 className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-muted" strokeWidth={2} aria-label="Welt-Chat" />}{title}</p>
          {lastMessage && (
            <time
              dateTime={lastMessage.at}
              suppressHydrationWarning
              className={`shrink-0 text-xs ${hasUnread ? "font-medium text-accent" : "text-muted"}`}
            >
              {chatTime(lastMessage.at)}
            </time>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${hasUnread ? "font-medium text-fg" : "text-muted"}`}>
            {lastMessage ? `${lastMessage.mine ? "Du: " : ""}${lastMessage.text}` : "Noch keine Nachrichten"}
          </p>
          {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-label="Stumm geschaltet" />}
          {hasUnread && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-strong px-1.5 text-[11px] font-semibold text-on-accent-strong"
              aria-label={`${unread} ungelesen`}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
