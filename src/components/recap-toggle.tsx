"use client";

import { useState } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { EmojiHtml } from "./custom-emoji-provider";

// Zusammenfassung einer Szene in der Story-Übersicht: ein Klick klappt sie direkt unter der Szene auf (ohne die Szene zu öffnen).
export function RecapToggle({ html, className = "" }: { html: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
        Zusammenfassung
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-line bg-surface px-4 py-3">
          <EmojiHtml className="post-content text-sm text-fg-soft" html={html} />
        </div>
      )}
    </div>
  );
}
