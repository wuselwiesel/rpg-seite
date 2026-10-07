"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ExternalLink, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OnlineAnyDot } from "@/components/online-status";
import { getBubbleChats, getBubbleUnread, type BubbleChat, type BubbleData } from "@/app/bubble-actions";
import { chatTime, messagePreview } from "@/lib/chat-preview";
import { CharacterAvatar } from "./character-avatar";
import { AccountMiniRoom, RpMiniRoom } from "./bubble-rooms";

export const BUBBLE_ENABLED_KEY = "wortwinkel:chat-bubble";
export const BUBBLE_CHANGE_EVENT = "wortwinkel:chat-bubble-change";
const POS_KEY = "wortwinkel:chat-bubble-pos";
const CHARACTER_KEY = "wortwinkel:chat-bubble-character";
const SIZE = 56;
const SCENE_PATH = /^\/story\/[0-9a-f-]{36}\/?$/i;

function subscribeSmallScreen(onChange: () => void) {
  const query = window.matchMedia("(max-width: 767px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function isSmallScreen() {
  return window.matchMedia("(max-width: 767px)").matches;
}

const HIDDEN_PATHS = /^\/(?:chats|redaktion\/chat|login|signup)(?:\/|$)/;

type Pos = { side: "left" | "right"; y: number };
type Preview = { key: number; kind: "account" | "rp"; id: string; title: string; avatarUrl: string | null; text: string };

function subscribeEnabled(callback: () => void) {
  window.addEventListener(BUBBLE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BUBBLE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function isBubbleEnabled(): boolean {
  try {
    return localStorage.getItem(BUBBLE_ENABLED_KEY) !== "off";
  } catch {
    return true;
  }
}

export function ChatBubble(props: {
  userId: string;
  myCharacterIds: string[];
  initialRpUnread: Record<string, number>;
  initialAccountUnread: Record<string, number>;
}) {
  const enabled = useSyncExternalStore(subscribeEnabled, isBubbleEnabled, () => false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const pathname = usePathname();
  // Am Handy verdeckt die Blase die Eingabe in einer Szene; dort gibt es den Reiter „Chat“ direkt in der Szene
  const smallScreen = useSyncExternalStore(subscribeSmallScreen, isSmallScreen, () => false);
  if (!mounted || !enabled || HIDDEN_PATHS.test(pathname ?? "")) return null;
  if (smallScreen && SCENE_PATH.test(pathname ?? "")) return null;
  return <BubbleInner {...props} pathname={pathname ?? ""} />;
}

function readPos(): Pos {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) ?? "null") as Pos | null;
    if (raw && (raw.side === "left" || raw.side === "right") && Number.isFinite(raw.y)) return raw;
  } catch {
    /* egal */
  }
  return { side: "right", y: Math.max(80, window.innerHeight - 190) };
}

const clampY = (y: number) => Math.min(Math.max(y, 72), window.innerHeight - SIZE - 96);

function BubbleInner({
  userId,
  myCharacterIds,
  initialRpUnread,
  initialAccountUnread,
  pathname,
}: {
  userId: string;
  myCharacterIds: string[];
  initialRpUnread: Record<string, number>;
  initialAccountUnread: Record<string, number>;
  pathname: string;
}) {
  const [pos, setPos] = useState<Pos>(readPos);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ kind: "account" | "rp"; id: string } | null>(null);
  const [data, setData] = useState<BubbleData | null>(null);
  const [filter, setFilter] = useState<"all" | "account" | "rp">("all");
  const [rpCharacterId, setRpCharacterId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHARACTER_KEY);
    } catch {
      return null;
    }
  });
  const rpCharacterRef = useRef(rpCharacterId);
  const [rpUnread, setRpUnread] = useState(initialRpUnread);
  const [accUnread, setAccUnread] = useState(initialAccountUnread);
  const [preview, setPreview] = useState<Preview | null>(null);
  const openViewRef = useRef<{ kind: string; id: string } | null>(null);
  const dataRef = useRef<BubbleData | null>(null);
  const myIdsRef = useRef(myCharacterIds);
  const pathRef = useRef(pathname);

  useEffect(() => {
    openViewRef.current = open && view ? view : null;
    dataRef.current = data;
    myIdsRef.current = myCharacterIds;
    pathRef.current = pathname;
    rpCharacterRef.current = rpCharacterId;
  });

  const refresh = useCallback(async () => {
    const next = await getBubbleChats(rpCharacterRef.current);
    setData(next);
    dataRef.current = next;
    return next;
  }, []);

  // Zähler exakt vom Server holen (statt blind hochzuzählen): richtiger Charakter, Lesezeitpunkte, keine eigenen Nachrichten.
  const refreshCounts = useCallback(async () => {
    const next = await getBubbleUnread(rpCharacterRef.current);
    setRpUnread(next.rp);
    setAccUnread(next.account);
  }, []);

  // Beim Start, bei Rückkehr zur App und regelmäßig abgleichen, damit nie eine Meldung "hängen bleibt" oder fehlt.
  useEffect(() => {
    void refreshCounts();
    const interval = setInterval(() => void refreshCounts(), 45_000);
    const onVisible = () => document.visibilityState === "visible" && void refreshCounts();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshCounts, rpCharacterId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getBubbleChats(rpCharacterId).then((next) => {
      if (cancelled) return;
      setData(next);
      dataRef.current = next;
    });
    return () => {
      cancelled = true;
    };
  }, [open, rpCharacterId]);

  // Live: neue Nachrichten zählen als ungelesen und lösen die kleine Vorschau aus.
  useEffect(() => {
    const supabase = createClient();
    let previewKey = 0;
    let countsTimer: ReturnType<typeof setTimeout> | null = null;
    // Mehrere Nachrichten kurz hintereinander ergeben nur eine Abfrage.
    const scheduleCounts = () => {
      if (countsTimer) clearTimeout(countsTimer);
      countsTimer = setTimeout(() => void refreshCounts(), 400);
    };

    async function showPreview(kind: "account" | "rp", id: string, text: string) {
      let info = dataRef.current?.chats.find((c) => c.kind === kind && c.id === id);
      if (!info) info = (await refresh()).chats.find((c) => c.kind === kind && c.id === id);
      if (!info) return;
      setPreview({ key: ++previewKey, kind, id, title: info.title, avatarUrl: info.avatarUrl, text });
    }

    const channel = supabase
      .channel(`bubble-watch-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as { chat_id: string; character_id: string; content: string; image_url: string | null };
        if (myIdsRef.current.includes(row.character_id)) return;
        const here = openViewRef.current;
        if ((here?.kind === "rp" && here.id === row.chat_id) || pathRef.current === `/chats/${row.chat_id}`) return;
        scheduleCounts();
        void showPreview("rp", row.chat_id, messagePreview(row));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "account_messages" }, (payload) => {
        const row = payload.new as { chat_id: string; sender_id: string; content: string; image_url: string | null };
        if (row.sender_id === userId) return;
        const here = openViewRef.current;
        if ((here?.kind === "account" && here.id === row.chat_id) || pathRef.current === `/redaktion/chat/${row.chat_id}`) return;
        scheduleCounts();
        void showPreview("account", row.chat_id, messagePreview(row));
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads", filter: `user_id=eq.${userId}` },
        (payload) => {
          const id = (payload.new as { chat_id?: string }).chat_id;
          if (id) setRpUnread((prev) => (id in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)) : prev));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "account_chat_participants", filter: `user_id=eq.${userId}` },
        (payload) => {
          const id = (payload.new as { chat_id?: string }).chat_id;
          if (id) setAccUnread((prev) => (id in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)) : prev));
        },
      )
      .subscribe();
    return () => {
      if (countsTimer) clearTimeout(countsTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, refreshCounts]);

  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setPreview(null), 6000);
    return () => clearTimeout(t);
  }, [preview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onResize = () => setPos((p) => ({ ...p, y: clampY(p.y) }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Am Knopf zählen alle neuen Nachrichten: Redaktion und RPG (aus Sicht des gewählten Charakters).
  const accTotal = Object.values(accUnread).reduce((a, b) => a + b, 0);
  const rpTotal = Object.values(rpUnread).reduce((a, b) => a + b, 0);
  const total = accTotal + rpTotal;

  function openChat(kind: "account" | "rp", id: string) {
    setView({ kind, id });
    setOpen(true);
    setPreview(null);
    if (kind === "account") setAccUnread((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== id)));
    else setRpUnread((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== id)));
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) d.moved = true;
    if (d.moved) setDrag({ x: e.clientX, y: e.clientY });
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) {
      const next: Pos = { side: e.clientX < window.innerWidth / 2 ? "left" : "right", y: clampY(e.clientY - SIZE / 2) };
      setPos(next);
      setDrag(null);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(next));
      } catch {
        /* egal */
      }
    } else {
      setOpen((v) => !v);
      setPreview(null);
    }
  }

  function chooseCharacter(id: string) {
    setRpCharacterId(id);
    setView(null);
    try {
      localStorage.setItem(CHARACTER_KEY, id);
    } catch {
      /* egal */
    }
  }

  const latest = data?.chats[0];
  const visibleChats = (data?.chats ?? []).filter((c) => filter === "all" || c.kind === filter);
  const current = view ? data?.chats.find((c) => c.kind === view.kind && c.id === view.id) : null;
  const unreadOf = (c: BubbleChat) => (c.kind === "account" ? accUnread[c.id] : rpUnread[c.id]) ?? 0;

  const bubbleStyle: React.CSSProperties = drag
    ? { left: drag.x - SIZE / 2, top: drag.y - SIZE / 2 }
    : pos.side === "left"
      ? { left: 12, top: pos.y }
      : { right: 12, top: pos.y };

  return (
    <>
      {!open && (
        <div className="fixed z-[60] print:hidden" style={bubbleStyle}>
          {preview && !drag && (
            <button
              type="button"
              onClick={() => openChat(preview.kind, preview.id)}
              className={`absolute top-1/2 flex w-60 -translate-y-1/2 items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5 text-left shadow-lg ${
                pos.side === "left" ? "left-[calc(100%+8px)]" : "right-[calc(100%+8px)]"
              }`}
            >
              <CharacterAvatar name={preview.title} avatarUrl={preview.avatarUrl} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-fg">{preview.title}</span>
                <span className="line-clamp-2 text-xs text-fg-soft">{preview.text}</span>
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label={total > 0 ? `Chats öffnen, ${total} neue Nachrichten` : "Chats öffnen"}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragRef.current = null;
              setDrag(null);
            }}
            // Kein natives Ziehen (Bild in der Blase) und kein Textmarkieren/Kontextmenü beim langen Drücken: sonst bricht das Verschieben ab
            onDragStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            style={{ width: SIZE, height: SIZE, touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
            className={`relative flex items-center justify-center rounded-full bg-accent-strong text-on-accent-strong shadow-lg ring-2 ring-surface transition active:scale-95 ${
              drag ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {latest && latest.avatarUrl && total > 0 ? (
              <CharacterAvatar name={latest.title} avatarUrl={latest.avatarUrl} size={SIZE - 6} />
            ) : (
              <MessageCircle className="h-6 w-6" strokeWidth={2} />
            )}
            {total > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-on-accent-strong ring-2 ring-surface">
                {total > 99 ? "99+" : total}
              </span>
            )}
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chats"
          className={`fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl print:hidden inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] h-[min(72dvh,560px)] sm:inset-x-auto sm:bottom-4 sm:w-[380px] ${
            pos.side === "left" ? "sm:left-4" : "sm:right-4"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-line px-2 py-2">
            {view ? (
              <button
                type="button"
                onClick={() => setView(null)}
                aria-label="Zurück zur Liste"
                className="flex h-9 w-9 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : (
              <span className="pl-2" />
            )}
            <div className="min-w-0 flex-1">
              {view && current ? (
                <div className="flex items-center gap-2">
                  <span className="relative shrink-0">
                    <CharacterAvatar name={current.title} avatarUrl={current.avatarUrl} size={28} />
                    <OnlineAnyDot userIds={current.otherUserIds} overlay />
                  </span>
                  <span className="truncate text-sm font-semibold text-fg">{current.title}</span>
                </div>
              ) : (
                <span className="font-serif text-lg text-fg">Chats</span>
              )}
            </div>
            {view && (
              <Link
                href={view.kind === "account" ? `/redaktion/chat/${view.id}` : `/chats/${view.id}${data?.activeCharacterId ? `?as=${data.activeCharacterId}` : ""}`}
                onClick={() => setOpen(false)}
                aria-label="Im Vollbild öffnen"
                title="Im Vollbild öffnen"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Schließen"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {view ? (
            view.kind === "account" ? (
              <AccountMiniRoom chatId={view.id} userId={userId} />
            ) : data?.activeCharacterId ? (
              <RpMiniRoom chatId={view.id} userId={userId} activeCharacterId={data.activeCharacterId} />
            ) : (
              <p className="p-6 text-center text-xs text-muted">Lädt…</p>
            )
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex gap-1.5 px-3 py-2">
                {(
                  [
                    ["all", "Alle"],
                    ["account", "Redaktion"],
                    ["rp", "RPG"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      filter === id ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
                    }`}
                  >
                    {label}
                    {(id === "account" ? accTotal : id === "rp" ? rpTotal : 0) > 0 && (
                      <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-on-accent-strong">
                        {id === "account" ? accTotal : rpTotal}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {filter === "rp" && data && data.characters.length > 0 && (
                <div className="flex items-center gap-2 px-3 pb-2">
                  <label htmlFor="bubble-character" className="shrink-0 text-xs text-muted">
                    Als
                  </label>
                  <select
                    id="bubble-character"
                    value={data.activeCharacterId ?? ""}
                    onChange={(e) => chooseCharacter(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
                  >
                    {data.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-1 pb-2">
                {!data && <p className="p-6 text-center text-xs text-muted">Lädt…</p>}
                {data && visibleChats.length === 0 && (
                  <p className="p-6 text-center text-xs text-muted">Keine Chats in dieser Ansicht.</p>
                )}
                {visibleChats.map((c) => {
                  const unread = unreadOf(c);
                  return (
                    <button
                      key={`${c.kind}-${c.id}`}
                      type="button"
                      onClick={() => openChat(c.kind, c.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface-2"
                    >
                      <span className="relative shrink-0">
                        <CharacterAvatar name={c.title} avatarUrl={c.avatarUrl} size={42} />
                        <OnlineAnyDot userIds={c.otherUserIds} overlay />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={`min-w-0 flex-1 truncate text-sm text-fg ${unread ? "font-semibold" : "font-medium"}`}>
                            {c.title}
                          </span>
                          {c.lastAt && (
                            <time dateTime={c.lastAt} suppressHydrationWarning className="shrink-0 text-[11px] text-muted">
                              {chatTime(c.lastAt)}
                            </time>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-xs ${unread ? "font-medium text-fg" : "text-muted"}`}>
                            {c.lastText ? `${c.lastMine ? "Du: " : ""}${c.lastText}` : "Noch keine Nachrichten"}
                          </span>
                          <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] text-muted">
                            {c.kind === "rp" ? "RPG" : c.accountKind === "group" ? "Gruppe" : c.accountKind === "world" ? "Welt" : "Redaktion"}
                          </span>
                          {unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-semibold text-on-accent-strong">
                              {unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
