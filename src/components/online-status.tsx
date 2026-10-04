"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { setPresenceMode } from "@/app/profile/actions";

export type PresenceMode = "online" | "offline";

type OnlineContextValue = {
  // false, wenn niemand angemeldet ist (dann gibt es keinen Status)
  enabled: boolean;
  mode: PresenceMode;
  onlineIds: ReadonlySet<string>;
  setMode: (mode: PresenceMode) => void;
};

const OnlineContext = createContext<OnlineContextValue>({ enabled: false, mode: "online", onlineIds: new Set(), setMode: () => {} });

const CHANNEL = "wortwinkel-online";

// Alle angemeldeten Geräte treten einem gemeinsamen Presence-Kanal bei und melden sich dort an, solange der Status auf „online“ steht.
// Wer „offline“ gewählt hat, schaut mit, meldet sich aber nicht an und erscheint für andere offline.
export function OnlineProvider({ userId, initialMode, children }: { userId: string | null; initialMode: PresenceMode; children: React.ReactNode }) {
  const [mode, setModeState] = useState<PresenceMode>(initialMode);
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribed = useRef(false);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
    if (subscribed.current && channelRef.current) {
      if (mode === "online") void channelRef.current.track({ at: Date.now() });
      else void channelRef.current.untrack();
    }
  }, [mode]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: userId } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => setOnlineIds(new Set(Object.keys(channel.presenceState()))))
      // Stellt man den Status an einem Gerät um, ziehen die anderen Geräte desselben Accounts sofort nach
      .on("broadcast", { event: "mode" }, ({ payload }) => {
        if (payload?.userId === userId && (payload.mode === "online" || payload.mode === "offline")) setModeState(payload.mode);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribed.current = true;
          if (modeRef.current === "online") void channel.track({ at: Date.now() });
        }
      });
    return () => {
      subscribed.current = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  function setMode(next: PresenceMode) {
    setModeState(next);
    void setPresenceMode(next);
    void channelRef.current?.send({ type: "broadcast", event: "mode", payload: { userId, mode: next } });
  }

  return <OnlineContext.Provider value={{ enabled: Boolean(userId), mode, onlineIds, setMode }}>{children}</OnlineContext.Provider>;
}

export function useOnline() {
  return useContext(OnlineContext);
}

// Ist dieser Account gerade online? Ohne Anmeldung oder wenn die Person offline gewählt hat: nein.
export function useIsOnline(userId: string | null | undefined): boolean {
  const { enabled, onlineIds } = useOnline();
  return Boolean(enabled && userId && onlineIds.has(userId));
}

// Grüner Punkt (online) oder grauer Punkt (offline); mit overlay sitzt er unten rechts auf einem Bild.
export function OnlineDot({ userId, overlay = false, className = "" }: { userId: string | null | undefined; overlay?: boolean; className?: string }) {
  const { enabled } = useOnline();
  const online = useIsOnline(userId);
  if (!enabled || !userId) return null;
  return (
    <span
      role="img"
      aria-label={online ? "Online" : "Offline"}
      title={online ? "Online" : "Offline"}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-muted/50"} ${
        overlay ? "absolute bottom-0 right-0 box-content h-3 w-3 border-2 border-app" : ""
      } ${className}`}
    />
  );
}

// Punkt mit Text „Online“ / „Offline“
export function OnlineBadge({ userId, className = "" }: { userId: string | null | undefined; className?: string }) {
  const { enabled } = useOnline();
  const online = useIsOnline(userId);
  if (!enabled || !userId) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${online ? "text-emerald-700 dark:text-emerald-400" : "text-muted"} ${className}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-muted/50"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

// Umschalter für den eigenen Status
export function OnlineToggle({ className = "" }: { className?: string }) {
  const { enabled, mode, setMode } = useOnline();
  if (!enabled) return null;
  const item = (id: PresenceMode, label: string, dot: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === id}
      onClick={() => setMode(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === id ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Mein Status" className={`flex w-full gap-1 rounded-lg bg-surface-2 p-1 ${className}`}>
      {item("online", "Online", "bg-emerald-500")}
      {item("offline", "Offline", "bg-muted/60")}
    </div>
  );
}

// „2 online“ für eine Gruppe (ohne dich selbst); nichts, wenn niemand online ist
export function OnlineCount({ userIds, selfId, className = "" }: { userIds: string[]; selfId?: string | null; className?: string }) {
  const { enabled, onlineIds } = useOnline();
  if (!enabled) return null;
  const n = new Set(userIds.filter((id) => id !== selfId && onlineIds.has(id))).size;
  if (n === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 ${className}`}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
      {n} online
    </span>
  );
}
