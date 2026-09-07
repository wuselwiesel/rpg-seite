"use client";

import { useState } from "react";
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

  return (
    <div className="flex flex-col gap-3">
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

      {mode === "write" ? (
        <StoryEntryForm
          storyPostId={storyPostId}
          worldId={worldId}
          characterName={characterName}
          characters={characters}
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
