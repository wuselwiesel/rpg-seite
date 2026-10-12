"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { setPresenceMode } from "@/app/profile/actions";
import { EmojiText } from "@/components/custom-emoji-provider";
import { deriveLooks, WRITING_REFRESH, type PresenceLook, type TrackPayload } from "@/lib/presence-looks";

export type PresenceMode = "online" | "offline";

// Was andere von dir sehen: Emoji (statt des Punkts) und optional Text
export type { PresenceLook };

type OnlineContextValue = {
  // false, wenn niemand angemeldet ist (dann gibt es keinen Status)
  enabled: boolean;
  mode: PresenceMode;
  onlineIds: ReadonlySet<string>;
  looks: ReadonlyMap<string, PresenceLook>;
  own: PresenceLook;
  setMode: (mode: PresenceMode) => void;
  setLook: (look: PresenceLook) => void;
  // „schreibt gerade“ für andere Geräte/Seiten (kontoweit, über den Presence-Kanal)
  setWriting: (writing: boolean) => void;
};

const OnlineContext = createContext<OnlineContextValue>({
  enabled: false,
  mode: "online",
  onlineIds: new Set(),
  looks: new Map(),
  own: { emoji: null, text: null },
  setMode: () => {},
  setLook: () => {},
  setWriting: () => {},
});

const CHANNEL = "wortwinkel-online";
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
  const writingRef = useRef(false);
  const writingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hochzählen baut den Kanal neu auf (nach Rückkehr in die App, Netzwechsel oder wenn Senden scheitert)
  const [epoch, setEpoch] = useState(0);
  const lastReset = useRef(0);
  const lastTrack = useRef(0);
  // Was der Kanal zuletzt gemeldet hat, und wann wir einen „schreibt“-Stand zum ersten Mal gesehen haben (siehe rebuild)
  const rawRef = useRef<Record<string, TrackPayload[]>>({});
  const seenWriting = useRef(new Map<string, number>());
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = (): TrackPayload => ({ at: Date.now(), emoji: ownRef.current.emoji, text: ownRef.current.text, writing: writingRef.current });

  function reconnect() {
    const now = Date.now();
    if (now - lastReset.current < 5000) return;
    lastReset.current = now;
    setEpoch((n) => n + 1);
  }

  // Meldet den eigenen Stand (online mit Emoji/Text/„schreibt“) oder nimmt ihn zurück (offline). Kommt keine Bestätigung,
  // ist die Verbindung tot: dann den Kanal neu aufbauen, statt dass man für andere offline bleibt.
  function publish() {
    const channel = channelRef.current;
    if (!channel || !subscribed.current) return;
    if (modeRef.current === "online") {
      lastTrack.current = Date.now();
      void channel.track(payload()).then((result) => {
        if (result !== "ok" && channelRef.current === channel) reconnect();
      });
    } else {
      void channel.untrack();
    }
  }

  function rebuild() {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const { looks: next, nextCheckIn } = deriveLooks(rawRef.current, seenWriting.current, Date.now());
    setLooks(next);
    if (nextCheckIn !== null) expiryTimer.current = setTimeout(rebuild, nextCheckIn + 50);
  }

  useEffect(() => {
    modeRef.current = mode;
    ownRef.current = own;
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, own]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL, { config: { presence: { key: userId } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        rawRef.current = channel.presenceState<TrackPayload>() as unknown as Record<string, TrackPayload[]>;
        rebuild();
        // Wir stehen auf „online“, fehlen aber im Kanal (Server hat uns nach einem Abbruch vergessen): neu melden
        if (modeRef.current === "online" && subscribed.current && !rawRef.current[userId] && Date.now() - lastTrack.current > 2000) publish();
      })
      // Stellt man den Status an einem Gerät um, ziehen die anderen Geräte desselben Accounts sofort nach
      .on("broadcast", { event: "mode" }, ({ payload }) => {
        if (payload?.userId === userId && (payload.mode === "online" || payload.mode === "offline")) setModeState(payload.mode);
      })
      .on("broadcast", { event: "look" }, ({ payload }) => {
        if (payload?.userId === userId) setOwn({ emoji: payload.emoji ?? null, text: payload.text ?? null });
      })
      .subscribe((status) => {
        if (channelRef.current !== channel) return;
        if (status === "SUBSCRIBED") {
          subscribed.current = true;
          publish();
        } else {
          subscribed.current = false;
        }
      });

    // Handy gesperrt oder Tab im Hintergrund: die Verbindung ist oft schon tot, ohne dass die App es merkt, und meldet sich erst
    // nach Minuten wieder an. Deshalb beim Zurückkommen (und bei Netzwechsel) den Kanal prüfen und bei Bedarf neu aufbauen.
    let hiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;
    function refresh(force: boolean) {
      if (!force && channelRef.current?.state === "joined") return;
      reconnect();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      refresh(away > 15000);
    }
    const onOnline = () => refresh(true);
    const onPageShow = (e: PageTransitionEvent) => refresh(e.persisted);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      subscribed.current = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, epoch]);

  function setMode(next: PresenceMode) {
    setModeState(next);
    void setPresenceMode(next);
    void channelRef.current?.send({ type: "broadcast", event: "mode", payload: { userId, mode: next } });
  }

  function setLook(next: PresenceLook) {
    setOwn(next);
    void channelRef.current?.send({ type: "broadcast", event: "look", payload: { userId, ...next } });
  }

  // Wird bei jeder Eingabe aufgerufen: meldet „schreibt“ (und alle paar Sekunden neu, solange man tippt)
  // und nimmt es nach 5 s ohne neue Eingabe zurück
  function setWriting(writing: boolean) {
    if (writingTimer.current) clearTimeout(writingTimer.current);
    const changed = writingRef.current !== writing;
    writingRef.current = writing;
    if (changed || (writing && Date.now() - lastTrack.current > WRITING_REFRESH)) publish();
    if (writing) {
      writingTimer.current = setTimeout(() => {
        writingRef.current = false;
        publish();
      }, 5000);
    }
  }

  const onlineIds = useMemo<ReadonlySet<string>>(() => new Set(looks.keys()), [looks]);

  return <OnlineContext.Provider value={{ enabled: Boolean(userId), mode, onlineIds, looks, own, setMode, setLook, setWriting }}>{children}</OnlineContext.Provider>;
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
export function useOnlineLook(userId: string | null | undefined): (PresenceLook & { online: boolean; writing: boolean }) {
  const { enabled, looks } = useOnline();
  const look = enabled && userId ? looks.get(userId) : undefined;
  return { online: Boolean(look), emoji: look?.emoji ?? null, text: look?.text ?? null, writing: look?.writing === true };
}

// Der Status selbst: grüner Punkt, oder das eigene Emoji an seiner Stelle
function StatusMark({ emoji, size = "sm" }: { emoji: string | null; size?: "sm" | "md" }) {
  if (emoji) return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center leading-none ${size === "md" ? "text-sm" : "text-xs"}`}><EmojiText text={emoji} /></span>;
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
        <EmojiText text={emoji} />
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
      {text && <span className="text-fg-soft"><EmojiText text={text} /></span>}
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
