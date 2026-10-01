"use client";

import { useEffect, useRef, useState } from "react";
import { BookMarked, Feather, Type } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StoryEntryForm } from "./story-entry-form";
import { DiceRollForm } from "./dice-roll-form";
import { ChapterForm } from "./chapter-form";
import { usePresenceStatus } from "@/lib/presence-status";
import { StatusList, StatusPicker } from "@/components/presence-status-ui";
import { WriterSelect } from "@/components/writer-select";
import type { Character } from "@/lib/types";

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

  // Zeigt anderen, die diese Szene gerade offen haben, wer hier schreibt (wie bei den Chats).
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`story-typing-${storyPostId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { characterId, name } = payload as { characterId: string; name: string };
        setTyping((prev) => ({ ...prev, [characterId]: { name, until: Date.now() + 4000 } }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [storyPostId]);

  // "schreibt gerade..." verschwindet nach ein paar Sekunden ohne neues Signal.
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

  const presence = usePresenceStatus(`story-${storyPostId}`, {
    characterId: writerId,
    name: narrator ? "Erzähler:in" : (writer?.name ?? "Jemand"),
  });

  function announceTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { characterId: writerId, name: narrator ? "Erzähler:in" : (writer?.name ?? "Jemand") },
    });
  }

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
        {mode === "write" && (
          <div className="flex items-center gap-0.5">
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
          </div>
        )}
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

      {Object.keys(typing).length > 0 && (
        <div className="-mt-1 flex items-center gap-2 text-xs text-muted" role="status">
          <span className="flex gap-0.5">
            <span className="typing-dot" />
            <span className="typing-dot [animation-delay:150ms]" />
            <span className="typing-dot [animation-delay:300ms]" />
          </span>
          {Object.values(typing).map((t) => t.name).join(", ")} schreibt…
        </div>
      )}

      <StatusList others={presence.others} hideIds={Object.keys(typing)} />
      <StatusPicker presence={presence} />

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
          onTyping={announceTyping}
        />
      ) : (
        <DiceRollForm
          storyPostId={storyPostId}
          worldId={worldId}
          sheetUrl={writer?.sheet_url}
          targets={others}
          writerId={writerId}
        />
      )}
    </div>
  );
}
