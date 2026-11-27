"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useUnread } from "./unread-provider";

export function ChatsNavLink() {
  const { allTotal } = useUnread();
  const pathname = usePathname();
  const isActive = pathname === "/chats" || pathname?.startsWith("/chats/");

  return (
    <Link
      href="/chats"
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
        isActive ? "bg-accent-strong text-on-accent-strong" : "text-fg-soft hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      Chats
      {allTotal > 0 && (
        <span
          aria-label={`${allTotal} ungelesen`}
          className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
            isActive ? "bg-on-accent-strong text-accent-strong" : "bg-accent-strong text-on-accent-strong"
          }`}
        >
          {allTotal > 99 ? "99+" : allTotal}
        </span>
      )}
    </Link>
  );
}
