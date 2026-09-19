"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useUnreadChatIds } from "@/lib/use-unread-chats";

export function MobileChatsTab({
  userId,
  myCharacterIds,
  initialUnreadCounts,
}: {
  userId: string;
  myCharacterIds: string[];
  initialUnreadCounts: Record<string, number>;
}) {
  const unread = useUnreadChatIds(userId, myCharacterIds, initialUnreadCounts);
  const pathname = usePathname();
  const isActive = pathname === "/chats" || pathname?.startsWith("/chats/");

  return (
    <Link
      href="/chats"
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition ${
        isActive ? "text-accent" : "text-muted"
      }`}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={2} />
      Chats
      {unread.total > 0 && (
        <span className="absolute right-[28%] top-2 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-strong" />
      )}
    </Link>
  );
}
