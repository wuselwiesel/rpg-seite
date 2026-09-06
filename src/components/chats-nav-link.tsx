"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";

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
  const pathnameRef = useRef(pathname);
  const charactersRef = useRef<Map<string, Character>>(new Map());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("characters")
      .select("*")
      .then(({ data }) => {
        charactersRef.current = new Map((data ?? []).map((c: Character) => [c.id, c]));
      });

    const channel = supabase
      .channel("global-message-watcher")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { chat_id: string; character_id: string; content: string };
          if (myCharacterIds.includes(row.character_id)) return;

          setUnread((prev) => new Set(prev).add(row.chat_id));

          const onThatChat = pathnameRef.current === `/chats/${row.chat_id}`;
          if (!onThatChat && typeof Notification !== "undefined" && Notification.permission === "granted") {
            const sender = charactersRef.current.get(row.character_id);
            new Notification(sender?.name ?? "Neue Nachricht", {
              body: row.content.slice(0, 140),
            });
          }
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
    <Link href="/chats" className="relative hover:text-amber-400">
      Chats
      {unread.size > 0 && (
        <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-semibold text-stone-950">
          {unread.size}
        </span>
      )}
    </Link>
  );
}
