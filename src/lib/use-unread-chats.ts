"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeUnreadCounts, type ChatWithMessages } from "@/lib/unread-counts";

// Anzahl ungelesener Nachrichten pro Chat, live über Realtime aktualisiert.
export function useUnreadChatIds(
  userId: string,
  myCharacterIds: string[],
  initialUnreadCounts: Record<string, number>,
) {
  const [counts, setCounts] = useState(initialUnreadCounts);
  const instanceId = useId();
  const pathname = usePathname();
  const idsKey = myCharacterIds.join(",");

  // Zählung neu vom Server holen (beim Seitenwechsel, Zurückkehren zur App und alle 30 s),
  // damit ein verpasstes Realtime-Ereignis keinen "Geister"-Punkt hinterlässt.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function refetch() {
      const [{ data: chats }, { data: reads }] = await Promise.all([
        supabase
          .from("chats")
          .select("id, messages(created_at, character_id), chat_participants(character_id)")
          .order("created_at", { referencedTable: "messages", ascending: false })
          .limit(100, { referencedTable: "messages" })
          .returns<ChatWithMessages[]>(),
        supabase.from("chat_reads").select("chat_id, last_read_at").eq("user_id", userId),
      ]);
      if (cancelled || !chats) return;
      setCounts(computeUnreadCounts(chats, reads ?? [], idsKey ? idsKey.split(",") : []));
    }
    // Direkt nach dem Verlassen eines Chats ist der Lese-Zeitstempel evtl. noch nicht gespeichert.
    const first = setTimeout(refetch, 800);
    const interval = setInterval(refetch, 30_000);
    const onVisible = () => document.visibilityState === "visible" && refetch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refetch);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetch);
    };
  }, [userId, idsKey, pathname]);

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
