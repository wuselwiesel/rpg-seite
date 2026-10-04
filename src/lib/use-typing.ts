"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const VISIBLE_MS = 4000;
const SEND_EVERY_MS = 2500;

// „schreibt gerade …“ für einen Chat: wer tippt, sendet alle paar Sekunden ein Broadcast-Signal; wer es empfängt, zeigt den Namen kurz an.
// Das Signal hat dieselbe Form wie im RPG-Chat (`characterId`, `name`), damit Chat-Raum und Chat-Blase sich gegenseitig sehen.
export function useTyping(channelName: string, selfId: string, selfName: string) {
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);
  const selfRef = useRef({ id: selfId, name: selfName });

  useEffect(() => {
    selfRef.current = { id: selfId, name: selfName };
  }, [selfId, selfName]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { characterId, name } = (payload ?? {}) as { characterId?: string; name?: string };
        if (!characterId || characterId === selfRef.current.id) return;
        setTyping((prev) => ({ ...prev, [characterId]: { name: name ?? "", until: Date.now() + VISIBLE_MS } }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setTyping({});
    };
  }, [channelName]);

  // Ohne neues Signal verschwindet die Anzeige nach ein paar Sekunden von selbst.
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.until > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typing]);

  const announce = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < SEND_EVERY_MS) return;
    lastSent.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { characterId: selfRef.current.id, name: selfRef.current.name },
    });
  }, []);

  // Kam eine Nachricht an, hört die Person offensichtlich auf zu tippen.
  const clear = useCallback(() => setTyping((prev) => (Object.keys(prev).length ? {} : prev)), []);

  return { names: Object.values(typing).map((t) => t.name), announce, clear };
}
