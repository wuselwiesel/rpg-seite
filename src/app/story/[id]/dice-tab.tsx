"use client";

import { useState } from "react";
import type { Character } from "@/lib/types";
import { DiceRollForm } from "./dice-roll-form";
import { YesNoRollForm } from "./yes-no-roll-form";

// Reiter „Würfeln“: normaler Würfelwurf oder Ja/Nein-Wurf
export function DiceTab({
  storyPostId,
  worldId,
  sheetUrl,
  targets,
  writerId,
  onTyping,
}: {
  storyPostId: string;
  worldId: string;
  sheetUrl?: string | null;
  targets: Character[];
  writerId: string;
  onTyping?: () => void;
}) {
  const [mode, setMode] = useState<"dice" | "yesno">("dice");
  const item = (id: "dice" | "yesno", label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === id}
      onClick={() => setMode(id)}
      className={`rounded-md px-3 py-1 text-sm transition ${mode === id ? "bg-surface text-fg shadow-sm" : "text-fg-soft hover:text-fg"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Art des Wurfs" className="flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
        {item("dice", "Würfel")}
        {item("yesno", "Ja / Nein")}
      </div>
      {mode === "dice" ? (
        <DiceRollForm storyPostId={storyPostId} worldId={worldId} sheetUrl={sheetUrl} targets={targets} writerId={writerId} onTyping={onTyping} />
      ) : (
        <YesNoRollForm storyPostId={storyPostId} worldId={worldId} writerId={writerId} onTyping={onTyping} />
      )}
    </div>
  );
}
