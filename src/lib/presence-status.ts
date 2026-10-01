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

export const CUSTOM_STATUS_MAX = 40;

export type PresenceEntry = { name: string; text: string };

type PresencePayload = { characterId: string; name: string; status: PresenceStatusId | null; custom?: string | null };

function cleanCustom(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, CUSTOM_STATUS_MAX) : "";
}

// Teilt den eigenen Status ("AFK", "denkt nach" …) mit allen, die denselben Raum offen haben.
// Der Status verschwindet automatisch, wenn die Seite geschlossen wird (Supabase Presence).
export function usePresenceStatus(room: string, me: { characterId: string; name: string }) {
  const [myStatus, setMyStatus] = useState<PresenceStatusId | null>(null);
  const [myCustom, setMyCustom] = useState("");
  const [others, setOthers] = useState<Record<string, PresenceEntry>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence-${room}`);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const next: Record<string, PresenceEntry> = {};
        for (const entries of Object.values(state)) {
          for (const e of entries) {
            const custom = cleanCustom(e.custom);
            const text = (custom ? `– ${custom}` : null) || (e.status ? presenceLabel(e.status) : null);
            if (text) next[e.characterId] = { name: e.name, text };
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
    channelRef.current?.track({ characterId: me.characterId, name: me.name, status: myStatus, custom: cleanCustom(myCustom) || null } satisfies PresencePayload);
  }, [ready, me.characterId, me.name, myStatus, myCustom]);

  // Vorgegebener Status und eigener Text schließen sich aus.
  const toggle = useCallback((id: PresenceStatusId) => {
    setMyCustom("");
    setMyStatus((cur) => (cur === id ? null : id));
  }, []);
  const setCustom = useCallback((text: string) => {
    setMyCustom(cleanCustom(text));
    setMyStatus(null);
  }, []);

  return {
    myStatus,
    myCustom,
    toggle,
    setCustom,
    others: Object.fromEntries(Object.entries(others).filter(([cid]) => cid !== me.characterId)),
  };
}
