"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ChatsNavLink({
  userId,
  myCharacterIds,
  initialUnreadChatIds,
}: {
  userId: string;
  myCharacterIds: string[];
  initialUnreadChatIds: string[];
}) {
  const [unread, setUnread] = useState(new Set(initialUnreadChatIds));
  const pathname = usePathname();
  const isActive = pathname === "/chats" || pathname?.startsWith("/chats/");

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("global-message-watcher")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { chat_id: string; character_id: string };
          if (myCharacterIds.includes(row.character_id)) return;

          setUnread((prev) => new Set(prev).add(row.chat_id));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { chat_id: string };
          setUnread((prev) => {
            const next = new Set(prev);
            next.delete(row.chat_id);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Link
      href="/chats"
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
        isActive ? "bg-accent-strong text-on-accent-strong" : "text-fg-soft hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      Chats
      {unread.size > 0 && (
        <span
          className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
            isActive ? "bg-on-accent-strong text-accent-strong" : "bg-accent-strong text-on-accent-strong"
          }`}
        >
          {unread.size}
        </span>
      )}
    </Link>
  );
}
