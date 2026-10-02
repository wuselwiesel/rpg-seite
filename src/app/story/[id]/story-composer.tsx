"use client";

import { useEffect, useRef, useState } from "react";
import { BookMarked, Feather, SmilePlus, Type, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StoryEntryForm } from "./story-entry-form";
import { DiceRollForm } from "./dice-roll-form";
import { ChapterForm } from "./chapter-form";
import { WriterSelect } from "@/components/writer-select";
import { SymbolPicker } from "@/components/symbol-picker";
import type { Character } from "@/lib/types";

// Vorgefertigte Status-Texte, die statt "schreibt/würfelt gerade" angezeigt werden können.
const STATUS_PRESETS = ["🚶 AFK", "🤔 Denkt gerade nach…", "☕ Ist kurz weg", "💤 Ist offline"];
// Ein gesetzter Status verfällt ohne erneutes Signal - läuft alle 15s erneut an, damit er für
// andere nicht zwischendurch verschwindet, solange er noch aktiv ist.
const STATUS_TTL = 30000;
const STATUS_RESEND_INTERVAL = 15000;

export function StoryComposer({
  storyPostId,
  worldId,
  ownCharacters,
  activeCharacterId,
  characters,
  participantIds,
}: {
  storyPostId: string;
  worldId: string;
  // Eigene Charaktere in dieser Welt (zur Auswahl) und der aktuell aktive.
  ownCharacters: Character[];
  activeCharacterId: string | null;
  // Alle ansprechbaren Charaktere der Welt (Erwähnungen, Wurf-Ziel, "Danach dran").
  characters: Character[];
  participantIds: string[];
}) {
  const [writerId, setWriterId] = useState(activeCharacterId ?? ownCharacters[0]?.id ?? "");

  // Wer zuletzt in dieser Szene geschrieben hat, bleibt auch nach einem Neuladen ausgewählt.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wortwinkel:writer:${storyPostId}`);
      if (saved && saved !== writerId && ownCharacters.some((c) => c.id === saved)) {
        setWriterId(saved);
      }
    } catch {
      /* egal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId]);

  // Beim Wechsel des schreibenden Charakters bleibt ein begonnener Entwurf stehen – nur wer
  // ausgewählt ist, ändert sich.
  function changeWriter(id: string) {
    setWriterId(id);
    try {
      localStorage.setItem(`wortwinkel:writer:${storyPostId}`, id);
    } catch {
      /* egal */
    }
  }
  const writer = ownCharacters.find((c) => c.id === writerId) ?? ownCharacters[0] ?? null;
  const others = characters.filter((c) => c.id !== writerId);
  const [mode, setMode] = useState<"write" | "roll">("write");
  const [showToolbar, setShowToolbar] = useState(false);
  const [narrator, setNarrator] = useState(false);
  const [showChapter, setShowChapter] = useState(false);

  // Zeigt anderen, die diese Szene gerade offen haben, wer hier schreibt oder würfelt (wie bei den Chats).
  const [typing, setTyping] = useState<Record<string, { name: string; until: number; kind: "write" | "roll" }>>({});
  // Frei gewählter Status (z.B. "AFK"), ersetzt die "schreibt/würfelt gerade"-Anzeige für diese Person.
  const [peerStatuses, setPeerStatuses] = useState<Record<string, { name: string; text: string; until: number }>>({});
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [statusSymbolsOpen, setStatusSymbolsOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`story-typing-${storyPostId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { characterId, name, kind } = payload as { characterId: string; name: string; kind: "write" | "roll" };
        setTyping((prev) => ({ ...prev, [characterId]: { name, until: Date.now() + 4000, kind } }));
      })
      .on("broadcast", { event: "status" }, ({ payload }) => {
        const { characterId, name, text } = payload as { characterId: string; name: string; text: string | null };
        setPeerStatuses((prev) => {
          if (!text) {
            if (!(characterId in prev)) return prev;
            const next = { ...prev };
            delete next[characterId];
            return next;
          }
          return { ...prev, [characterId]: { name, text, until: Date.now() + STATUS_TTL } };
        });
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [storyPostId]);

  // "schreibt gerade..." bzw. ein gesetzter Status verschwindet ohne erneutes Signal von selbst.
  useEffect(() => {
    if (Object.keys(typing).length === 0 && Object.keys(peerStatuses).length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTyping((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.until > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
      setPeerStatuses((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.until > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typing, peerStatuses]);

  function announceTyping(kind: "write" | "roll") {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { characterId: writerId, name: narrator ? "Erzähler:in" : (writer?.name ?? "Jemand"), kind },
    });
  }

  function announceStatus(text: string | null) {
    channelRef.current?.send({
      type: "broadcast",
      event: "status",
      payload: { characterId: writerId, name: narrator ? "Erzähler:in" : (writer?.name ?? "Jemand"), text },
    });
  }

  function setStatus(text: string | null) {
    setMyStatus(text);
    announceStatus(text);
    setStatusMenuOpen(false);
    setStatusSymbolsOpen(false);
  }

  // Solange ein Status aktiv ist, regelmäßig erneut senden, damit er anderen nicht zwischendurch
  // wegläuft (siehe STATUS_TTL/-RESEND_INTERVAL oben).
  useEffect(() => {
    if (!myStatus) return;
    const timer = setInterval(() => announceStatus(myStatus), STATUS_RESEND_INTERVAL);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStatus]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    function onDown(e: PointerEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStatusMenuOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [statusMenuOpen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "write" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            Schreiben
          </button>
          <button
            type="button"
            onClick={() => setMode("roll")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "roll" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            Würfeln
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {mode === "write" && (
            <>
              <button
                type="button"
                onClick={() => setNarrator((v) => !v)}
                aria-pressed={narrator}
                title={narrator ? "Als Erzähler:in schreiben: an" : "Als Erzähler:in schreiben"}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  narrator ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Feather className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setShowChapter((v) => !v)}
                aria-pressed={showChapter}
                title="Neues Kapitel beginnen"
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  showChapter ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <BookMarked className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setShowToolbar((v) => !v)}
                title={showToolbar ? "Formatierung ausblenden" : "Formatierung anzeigen"}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  showToolbar ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Type className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          )}
          <div className="relative" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => setStatusMenuOpen((v) => !v)}
              aria-expanded={statusMenuOpen}
              title={myStatus ? `Status: ${myStatus}` : "Status setzen"}
              className={`flex h-8 items-center gap-1 rounded-full px-2 text-xs transition ${
                myStatus ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <SmilePlus className="h-4 w-4 shrink-0" strokeWidth={2} />
              {myStatus && <span className="max-w-[7rem] truncate">{myStatus}</span>}
            </button>
            {statusMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg">
                <p className="mb-1.5 px-1 text-xs text-muted">
                  Ersetzt &bdquo;schreibt/würfelt gerade&ldquo; für andere in dieser Szene.
                </p>
                <div className="flex flex-col gap-0.5">
                  {STATUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatus(preset)}
                      className={`rounded-lg px-2 py-1.5 text-left text-sm transition ${
                        myStatus === preset ? "bg-accent-strong text-on-accent-strong" : "text-fg hover:bg-surface-2"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
                  <input
                    type="text"
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && statusDraft.trim()) {
                        e.preventDefault();
                        setStatus(statusDraft.trim());
                        setStatusDraft("");
                      }
                    }}
                    placeholder="Eigener Status..."
                    maxLength={60}
                    className="min-w-0 flex-1 rounded-md border border-line bg-app px-2 py-1 text-sm text-fg outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setStatusSymbolsOpen((v) => !v)}
                    aria-expanded={statusSymbolsOpen}
                    title="Symbole/Emojis einfügen"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                      statusSymbolsOpen ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    ✦
                  </button>
                  <button
                    type="button"
                    disabled={!statusDraft.trim()}
                    onClick={() => {
                      setStatus(statusDraft.trim());
                      setStatusDraft("");
                    }}
                    className="shrink-0 rounded-md bg-accent-strong px-2 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
                  >
                    OK
                  </button>
                </div>
                {statusSymbolsOpen && (
                  <div className="mt-1.5">
                    <SymbolPicker
                      onPick={(symbol) => setStatusDraft((prev) => `${prev}${symbol}`)}
                      onClose={() => setStatusSymbolsOpen(false)}
                    />
                  </div>
                )}
                {myStatus && (
                  <button
                    type="button"
                    onClick={() => setStatus(null)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-line pt-2 text-xs font-medium text-muted hover:text-fg"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                    Status entfernen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(mode === "roll" || !narrator) && (
        <WriterSelect characters={ownCharacters} value={writerId} onChange={changeWriter} />
      )}
      {mode === "write" && narrator && (
        <p className="text-xs text-muted">
          Du schreibst als <span className="text-sm font-medium text-fg-soft">Erzähler:in</span> – ohne Charakter.
        </p>
      )}

      {mode === "write" && showChapter && (
        <ChapterForm storyPostId={storyPostId} worldId={worldId} writerId={writerId} onDone={() => setShowChapter(false)} />
      )}

      {(Object.keys(typing).length > 0 || Object.keys(peerStatuses).length > 0) && (
        <div className="-mt-1 flex items-center gap-2 text-xs text-muted" role="status">
          <span className="flex gap-0.5">
            <span className="typing-dot" />
            <span className="typing-dot [animation-delay:150ms]" />
            <span className="typing-dot [animation-delay:300ms]" />
          </span>
          {(() => {
            // Ein gesetzter Status ersetzt die "schreibt/würfelt"-Anzeige für diese Person.
            const statusIds = new Set(Object.keys(peerStatuses));
            const entries = Object.entries(typing)
              .filter(([id]) => !statusIds.has(id))
              .map(([, v]) => v);
            const writers = entries.filter((t) => t.kind !== "roll").map((t) => t.name);
            const rollers = entries.filter((t) => t.kind === "roll").map((t) => t.name);
            const statusLines = Object.values(peerStatuses).map((s) => `${s.name} ${s.text}`);
            const parts = [...statusLines];
            if (writers.length) parts.push(`${writers.join(", ")} schreibt…`);
            if (rollers.length) parts.push(`${rollers.join(", ")} würfelt…`);
            return parts.join(" · ");
          })()}
        </div>
      )}

      {mode === "write" ? (
        <StoryEntryForm
          storyPostId={storyPostId}
          worldId={worldId}
          characterName={writer?.name ?? "deinem Charakter"}
          characters={characters}
          participantIds={participantIds}
          narrator={narrator}
          showToolbar={showToolbar}
          writerId={writerId}
          onTyping={() => announceTyping("write")}
        />
      ) : (
        <DiceRollForm
          storyPostId={storyPostId}
          worldId={worldId}
          sheetUrl={writer?.sheet_url}
          targets={others}
          writerId={writerId}
          onTyping={() => announceTyping("roll")}
        />
      )}
    </div>
  );
}
