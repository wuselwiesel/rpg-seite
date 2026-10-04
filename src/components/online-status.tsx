"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { setPresenceMode } from "@/app/profile/actions";

export type PresenceMode = "online" | "offline";

// Was andere von dir sehen: Emoji (statt des Punkts) und optional Text
export type PresenceLook = { emoji: string | null; text: string | null };

type OnlineContextValue = {
  // false, wenn niemand angemeldet ist (dann gibt es keinen Status)
  enabled: boolean;
  mode: PresenceMode;
  onlineIds: ReadonlySet<string>;
  looks: ReadonlyMap<string, PresenceLook>;
  own: PresenceLook;
  setMode: (mode: PresenceMode) => void;
  setLook: (look: PresenceLook) => void;
};

const OnlineContext = createContext<OnlineContextValue>({
  enabled: false,
  mode: "online",
  onlineIds: new Set(),
  looks: new Map(),
  own: { emoji: null, text: null },
  setMode: () => {},
  setLook: () => {},
});

const CHANNEL = "wortwinkel-online";

type TrackPayload = { at: number; emoji?: string | null; text?: string | null };

// Alle angemeldeten Geräte treten einem gemeinsamen Presence-Kanal bei und melden sich dort an, solange der Status auf „online“ steht.
// Wer „offline“ gewählt hat, schaut mit, meldet sich aber nicht an und erscheint für andere offline.
// Emoji und Text reisen mit der Anmeldung im Kanal mit, andere lesen sie also ohne Datenbankabfrage.
export function OnlineProvider({
  userId,
  initialMode,
  initialEmoji = null,
  initialText = null,
  children,
}: {
  userId: string | null;
  initialMode: PresenceMode;
  initialEmoji?: string | null;
  initialText?: string | null;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<PresenceMode>(initialMode);
  const [own, setOwn] = useState<PresenceLook>({ emoji: initialEmoji, text: initialText });
  const [looks, setLooks] = useState<ReadonlyMap<string, PresenceLook>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribed = useRef(false);
  const modeRef = useRef(mode);
  const ownRef = useRef(own);

  const payload = (): TrackPayload => ({ at: Date.now(), emoji: ownRef.current.emoji, text: ownRef.current.text });

  useEffect(() => {
    modeRef.current = mode;
    ownRef.current = own;
    if (subscribed.current && channelRef.current) {
      if (mode === "online") void channelRef.current.track(payload());
      else void channelRef.current.untrack();
    }
  }, [mode, own]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: userId } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        const next = new Map<string, PresenceLook>();
        for (const [key, entries] of Object.entries(channel.presenceState<TrackPayload>())) {
          const latest = [...entries].sort((x, y) => (y.at ?? 0) - (x.at ?? 0))[0];
          next.set(key, { emoji: latest?.emoji ?? null, text: latest?.text ?? null });
        }
        setLooks(next);
      })
      // Stellt man den Status an einem Gerät um, ziehen die anderen Geräte desselben Accounts sofort nach
      .on("broadcast", { event: "mode" }, ({ payload }) => {
        if (payload?.userId === userId && (payload.mode === "online" || payload.mode === "offline")) setModeState(payload.mode);
      })
      .on("broadcast", { event: "look" }, ({ payload }) => {
        if (payload?.userId === userId) setOwn({ emoji: payload.emoji ?? null, text: payload.text ?? null });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribed.current = true;
          if (modeRef.current === "online") void channel.track({ at: Date.now(), emoji: ownRef.current.emoji, text: ownRef.current.text });
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

  function setLook(next: PresenceLook) {
    setOwn(next);
    void channelRef.current?.send({ type: "broadcast", event: "look", payload: { userId, ...next } });
  }

  const onlineIds = useMemo<ReadonlySet<string>>(() => new Set(looks.keys()), [looks]);

  return <OnlineContext.Provider value={{ enabled: Boolean(userId), mode, onlineIds, looks, own, setMode, setLook }}>{children}</OnlineContext.Provider>;
}

export function useOnline() {
  return useContext(OnlineContext);
}

// Ist dieser Account gerade online? Ohne Anmeldung oder wenn die Person offline gewählt hat: nein.
export function useIsOnline(userId: string | null | undefined): boolean {
  const { enabled, onlineIds } = useOnline();
  return Boolean(enabled && userId && onlineIds.has(userId));
}

// Online? Und wie sieht der Status aus (Emoji, Text)?
export function useOnlineLook(userId: string | null | undefined): (PresenceLook & { online: boolean }) {
  const { enabled, looks } = useOnline();
  const look = enabled && userId ? looks.get(userId) : undefined;
  return { online: Boolean(look), emoji: look?.emoji ?? null, text: look?.text ?? null };
}

// Der Status selbst: grüner Punkt, oder das eigene Emoji an seiner Stelle
function StatusMark({ emoji, size = "sm" }: { emoji: string | null; size?: "sm" | "md" }) {
  if (emoji) return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center leading-none ${size === "md" ? "text-sm" : "text-xs"}`}>{emoji}</span>;
  return <span aria-hidden className={`shrink-0 rounded-full bg-emerald-500 ${size === "md" ? "h-3 w-3" : "h-2 w-2"}`} />;
}

// Nur wenn die Person online ist: grüner Punkt (oder ihr Emoji); offline wird nichts gezeigt. Mit overlay sitzt er unten rechts auf einem Bild.
export function OnlineDot({ userId, overlay = false, className = "" }: { userId: string | null | undefined; overlay?: boolean; className?: string }) {
  const { online, emoji, text } = useOnlineLook(userId);
  if (!online) return null;
  const label = text ? `Online – ${text}` : "Online";
  if (emoji) {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-app text-[11px] leading-none ${overlay ? "absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px]" : "h-4 w-4"} ${className}`}
      >
        {emoji}
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ${overlay ? "absolute bottom-0 right-0 box-content h-3 w-3 border-2 border-app" : ""} ${className}`}
    />
  );
}

// Punkt (oder Emoji), dahinter der Text, falls die Person einen gesetzt hat; offline nichts
export function OnlineBadge({ userId, className = "" }: { userId: string | null | undefined; className?: string }) {
  const { online, emoji, text } = useOnlineLook(userId);
  if (!online) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 ${className}`} title={text ? `Online – ${text}` : "Online"}>
      <StatusMark emoji={emoji} />
      {text && <span className="text-fg-soft">{text}</span>}
    </span>
  );
}

// Umschalter für den eigenen Status (Online / Offline)
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

// Grüner Punkt mit Zahl für eine Gruppe (ohne dich selbst); nichts, wenn niemand online ist
export function OnlineCount({ userIds, selfId, className = "" }: { userIds: string[]; selfId?: string | null; className?: string }) {
  const { enabled, onlineIds } = useOnline();
  if (!enabled) return null;
  const n = new Set(userIds.filter((id) => id !== selfId && onlineIds.has(id))).size;
  if (n === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 ${className}`} title={`${n} online`}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
      {n}
    </span>
  );
}

// Punkt auf dem Bild einer Chat-Zeile: bei einer Person ihr Status (Punkt oder Emoji), bei mehreren ein Punkt, sobald jemand online ist
export function OnlineAnyDot({ userIds, overlay = false }: { userIds: string[]; overlay?: boolean }) {
  const { enabled, onlineIds } = useOnline();
  if (!enabled) return null;
  if (userIds.length === 1) return <OnlineDot userId={userIds[0]} overlay={overlay} />;
  if (!userIds.some((id) => onlineIds.has(id))) return null;
  return (
    <span
      role="img"
      aria-label="Online"
      title="Online"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ${overlay ? "absolute bottom-0 right-0 box-content h-3 w-3 border-2 border-app" : ""}`}
    />
  );
}
