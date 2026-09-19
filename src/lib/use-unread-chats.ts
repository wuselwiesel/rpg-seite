"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Anzahl ungelesener Nachrichten pro Chat, live über Realtime aktualisiert.
export function useUnreadChatIds(
  userId: string,
  _myCharacterIds: string[],
  initialUnreadCounts: Record<string, number>,
) {
  const [counts, setCounts] = useState(initialUnreadCounts);
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`global-message-watcher-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { chat_id: string };
          if (window.location.pathname === `/chats/${row.chat_id}`) return;

          setCounts((prev) => ({ ...prev, [row.chat_id]: (prev[row.chat_id] ?? 0) + 1 }));
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
          setCounts((prev) => {
            if (!(row.chat_id in prev)) return prev;
            const next = { ...prev };
            delete next[row.chat_id];
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

  return { counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) };
}
