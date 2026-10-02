"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FileText } from "lucide-react";
import type { MentionListHandle } from "./mention-list";

import type { WikiMentionItem } from "@/lib/wiki-mention";

// Auswahlliste für @ im Wiki-Editor: Seiten der Welt. Ein Eintrag für einen neuen Titel legt einen roten Link an.
export const WikiMentionList = forwardRef<
  MentionListHandle,
  { items: WikiMentionItem[]; command: (item: WikiMentionItem) => void }
>(function WikiMentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  function selectItem(index: number) {
    const item = items[index];
    if (item) command(item);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div className="max-h-60 w-64 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-lg" role="listbox" aria-label="Wiki-Seite verlinken">
      {items.map((item, index) => (
        <button
          key={item.id || `neu-${item.title}`}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
            index === selectedIndex ? "bg-accent-strong text-on-accent-strong" : "text-fg hover:bg-surface-2"
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">{item.id ? item.title : `Neue Seite „${item.title}“`}</span>
        </button>
      ))}
    </div>
  );
});
