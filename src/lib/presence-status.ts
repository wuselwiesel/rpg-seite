"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const PRESENCE_STATUSES = [
  { id: "thinking", chip: "denkt nach", label: "denkt gerade nach…" },
  { id: "brb", chip: "kurz weg", label: "ist kurz weg" },
  { id: "afk", chip: "AFK", label: "ist AFK" },
  { id: "offline", chip: "offline", label: "ist offline" },
] as const;

export type PresenceStatusId = (typeof PRESENCE_STATUSES)[number]["id"];

export function presenceLabel(id: string): string | null {
  return PRESENCE_STATUSES.find((s) => s.id === id)?.label ?? null;
}

type PresencePayload = { characterId: string; name: string; status: PresenceStatusId | null };

// Teilt den eigenen Status ("AFK", "denkt nach" …) mit allen, die denselben Raum offen haben.
// Der Status verschwindet automatisch, wenn die Seite geschlossen wird (Supabase Presence).
export function usePresenceStatus(room: string, me: { characterId: string; name: string }) {
  const [myStatus, setMyStatus] = useState<PresenceStatusId | null>(null);
  const [others, setOthers] = useState<Record<string, { name: string; status: PresenceStatusId }>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence-${room}`);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const next: Record<string, { name: string; status: PresenceStatusId }> = {};
        for (const entries of Object.values(state)) {
          for (const e of entries) {
            if (e.status && presenceLabel(e.status)) next[e.characterId] = { name: e.name, status: e.status };
          }
        }
        setOthers(next);
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setReady(true);
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      setReady(false);
      supabase.removeChannel(channel);
    };
  }, [room]);

  useEffect(() => {
    if (!ready) return;
    channelRef.current?.track({ characterId: me.characterId, name: me.name, status: myStatus } satisfies PresencePayload);
  }, [ready, me.characterId, me.name, myStatus]);

  const toggle = useCallback((id: PresenceStatusId) => setMyStatus((cur) => (cur === id ? null : id)), []);

  return {
    myStatus,
    toggle,
    others: Object.fromEntries(Object.entries(others).filter(([cid]) => cid !== me.characterId)),
  };
}
