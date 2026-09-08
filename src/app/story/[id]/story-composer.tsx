"use client";

import { useState } from "react";
import { Type } from "lucide-react";
import { StoryEntryForm } from "./story-entry-form";
import { DiceRollForm } from "./dice-roll-form";
import type { Character } from "@/lib/types";

export function StoryComposer({
  storyPostId,
  worldId,
  characterName,
  characters,
  sheetUrl,
}: {
  storyPostId: string;
  worldId: string;
  characterName: string;
  characters: Character[];
  sheetUrl?: string | null;
}) {
  const [mode, setMode] = useState<"write" | "roll">("write");
  const [showToolbar, setShowToolbar] = useState(false);

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
        )}
      </div>

      {mode === "write" ? (
        <StoryEntryForm
          storyPostId={storyPostId}
          worldId={worldId}
          characterName={characterName}
          characters={characters}
          showToolbar={showToolbar}
        />
      ) : (
        <DiceRollForm
          storyPostId={storyPostId}
          worldId={worldId}
          sheetUrl={sheetUrl}
          targets={characters}
        />
      )}
    </div>
  );
}
