"use client";

import { useState } from "react";
import { BookMarked, Feather, Type } from "lucide-react";
import { StoryEntryForm } from "./story-entry-form";
import { DiceRollForm } from "./dice-roll-form";
import { ChapterForm } from "./chapter-form";
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
  const writer = ownCharacters.find((c) => c.id === writerId) ?? ownCharacters[0] ?? null;
  const others = characters.filter((c) => c.id !== writerId);
  const [mode, setMode] = useState<"write" | "roll">("write");
  const [showToolbar, setShowToolbar] = useState(false);
  const [narrator, setNarrator] = useState(false);
  const [showChapter, setShowChapter] = useState(false);

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
        <WriterSelect characters={ownCharacters} value={writerId} onChange={setWriterId} />
      )}
      {mode === "write" && narrator && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg-soft">
          Du schreibst als <span className="font-medium text-fg">Erzähler:in</span> – ohne Charakter.
        </p>
      )}

      {mode === "write" && showChapter && (
        <ChapterForm storyPostId={storyPostId} worldId={worldId} writerId={writerId} onDone={() => setShowChapter(false)} />
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
