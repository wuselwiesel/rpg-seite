"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useUnreadChatIds } from "@/lib/use-unread-chats";

export function MobileChatsTab({
  userId,
  myCharacterIds,
  initialUnreadChatIds,
}: {
  userId: string;
  myCharacterIds: string[];
  initialUnreadChatIds: string[];
}) {
  const unread = useUnreadChatIds(userId, myCharacterIds, initialUnreadChatIds);
  const pathname = usePathname();
  const isActive = pathname === "/chats" || pathname?.startsWith("/chats/");

  return (
    <Link
      href="/chats"
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
        isActive ? "text-accent" : "text-muted"
      }`}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={2} />
      Chats
      {unread.size > 0 && (
        <span className="absolute right-[28%] top-1 h-2 w-2 rounded-full bg-accent-strong" />
      )}
    </Link>
  );
}
