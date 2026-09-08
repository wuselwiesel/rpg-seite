"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

export type MentionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const MentionList = forwardRef<
  MentionListHandle,
  { items: Character[]; command: (item: { id: string; label: string }) => void }
>(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  function selectItem(index: number) {
    const item = items[index];
    if (item) command({ id: item.id, label: item.name });
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div className="max-h-56 w-56 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-lg">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
            index === selectedIndex ? "bg-accent-strong text-on-accent-strong" : "text-fg hover:bg-surface-2"
          }`}
        >
          <CharacterAvatar name={item.name} avatarUrl={item.avatar_url} size={20} />
          {item.name}
        </button>
      ))}
    </div>
  );
});
