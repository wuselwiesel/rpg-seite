"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadChatIds(
  userId: string,
  myCharacterIds: string[],
  initialUnreadChatIds: string[],
) {
  const [unread, setUnread] = useState(new Set(initialUnreadChatIds));
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`global-message-watcher-${instanceId}`)
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

  return unread;
}
