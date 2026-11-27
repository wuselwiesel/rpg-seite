"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useUnread } from "./unread-provider";

export function MobileChatsTab() {
  const { allTotal } = useUnread();
  const pathname = usePathname();
  const isActive = pathname === "/chats" || pathname?.startsWith("/chats/");

  return (
    <Link
      href="/chats"
      aria-label={allTotal > 0 ? `Chats, ${allTotal} ungelesen` : "Chats"}
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition ${
        isActive ? "text-fg" : "text-muted"
      }`}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={isActive ? 2.6 : 2} />
      <span>Chats</span>
      {allTotal > 0 && (
        <span className="absolute right-[24%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-surface bg-accent-strong px-1 text-[10px] font-semibold leading-none text-on-accent-strong box-content">
          {allTotal > 99 ? "99+" : allTotal}
        </span>
      )}
    </Link>
  );
}
