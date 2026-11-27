"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeUnreadCounts, computeUnreadPerCharacter, type ChatWithMessages } from "@/lib/unread-counts";

// Anzahl ungelesener Nachrichten pro Chat, live über Realtime aktualisiert. Mit `forCharacterId` (dem aktiven
// Charakter) wird wie in der Chatliste nur aus dessen Sicht gezählt; ohne Angabe aus der Sicht aller eigenen Charaktere.
export function useUnreadChatIds(
  userId: string,
  myCharacterIds: string[],
  initialUnreadCounts: Record<string, number>,
  forCharacterId?: string | null,
  initialPerCharacter: Record<string, number> = {},
) {
  const [counts, setCounts] = useState(initialUnreadCounts);
  const [perCharacter, setPerCharacter] = useState(initialPerCharacter);
  const instanceId = useId();
  const pathname = usePathname();
  const idsKey = myCharacterIds.join(",");
  const refetchRef = useRef<() => void>(() => {});
  const myIdsRef = useRef(myCharacterIds);
  useEffect(() => {
    myIdsRef.current = myCharacterIds;
  });

  // Zählung neu vom Server holen (beim Seitenwechsel, Zurückkehren zur App und alle 60 s, nur im sichtbaren Tab),
  // damit ein verpasstes Realtime-Ereignis keinen "Geister"-Punkt hinterlässt.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function refetch() {
      if (document.visibilityState !== "visible") return;
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
      const ids = idsKey ? idsKey.split(",") : [];
      setCounts(computeUnreadCounts(chats, reads ?? [], ids, forCharacterId ?? undefined));
      setPerCharacter(computeUnreadPerCharacter(chats, reads ?? [], ids));
    }
    refetchRef.current = refetch;
    // Direkt nach dem Verlassen eines Chats ist der Lese-Zeitstempel evtl. noch nicht gespeichert.
    const first = setTimeout(refetch, 800);
    const interval = setInterval(refetch, 60_000);
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
  }, [userId, idsKey, pathname, forCharacterId]);

  useEffect(() => {
    const supabase = createClient();

    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`global-message-watcher-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { chat_id: string; character_id: string };
          if (window.location.pathname === `/chats/${row.chat_id}`) return;
          // Eigene Nachrichten (z. B. aus der Chat-Blase) sind nie ungelesen.
          if (myIdsRef.current.includes(row.character_id)) return;
          // Statt blind +1: neu zählen, damit der Zähler genau zur Chatliste passt (richtiger Charakter, Lesezeitpunkt).
          if (refetchTimer) clearTimeout(refetchTimer);
          refetchTimer = setTimeout(() => refetchRef.current(), 500);
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
          // Die Zahlen je Figur ändern sich mit: neu zählen statt zu raten
          refetchRef.current();
        },
      )
      .subscribe();

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, n) => a + n, 0);
  // total: aus Sicht der aktiven Figur (wie die Chatliste); allTotal: alle eigenen Figuren zusammen
  return { counts, total: sum(counts), perCharacter, allTotal: sum(perCharacter) };
}
