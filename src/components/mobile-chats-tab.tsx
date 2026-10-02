"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useUnreadChatIds } from "@/lib/use-unread-chats";

export function MobileChatsTab({
  userId,
  myCharacterIds,
  initialUnreadCounts,
  activeCharacterId,
}: {
  userId: string;
  myCharacterIds: string[];
  initialUnreadCounts: Record<string, number>;
  activeCharacterId?: string | null;
}) {
  const unread = useUnreadChatIds(userId, myCharacterIds, initialUnreadCounts, activeCharacterId);
  const pathname = usePathname();
  const isActive = pathname === "/chats" || pathname?.startsWith("/chats/");

  return (
    <Link
      href="/chats"
      aria-label="Chats"
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-3.5 text-[11px] font-medium transition ${
        isActive ? "text-fg" : "text-muted"
      }`}
    >
      <MessageCircle className="h-[26px] w-[26px]" strokeWidth={isActive ? 2.6 : 2} />
      <span className="sr-only">Chats</span>
      {unread.total > 0 && (
        <span className="absolute right-[30%] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-strong" />
      )}
    </Link>
  );
}
