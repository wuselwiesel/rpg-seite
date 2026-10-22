"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { searchKey } from "@/lib/search-replace-extension";

// Leiste „Suchen und Ersetzen“ über dem Text einer Notiz
export function EditorSearch({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [cs, setCs] = useState(false);
  const [, force] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const rerender = () => force((n) => n + 1);
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
      editor.commands.setSearch("");
    };
  }, [editor]);

  const st = searchKey.getState(editor.state);
  const total = st?.matches.length ?? 0;
  const label = query ? (total === 0 ? "Keine Treffer" : `${(st?.current ?? 0) + 1} von ${total}`) : "";
  const btn = "flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30";
  const small = "rounded-full border border-line px-2.5 py-1 text-xs text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-40";

  return (
    <div role="search" aria-label="Suchen und Ersetzen" className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-2 px-2 py-1.5">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          editor.commands.setSearch(e.target.value, cs);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor.commands.stepSearch(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") onClose();
        }}
        placeholder="Suchen"
        aria-label="Suchen"
        className="w-36 rounded-full border border-line bg-surface px-3 py-1 text-sm text-fg outline-none focus:border-accent"
      />
      <span className="min-w-14 text-xs tabular-nums text-muted" aria-live="polite">
        {label}
      </span>
      <button type="button" onClick={() => editor.commands.stepSearch(-1)} disabled={total === 0} aria-label="Voriger Treffer" className={btn}>
        <ChevronUp className="h-4 w-4" strokeWidth={2} />
      </button>
      <button type="button" onClick={() => editor.commands.stepSearch(1)} disabled={total === 0} aria-label="Nächster Treffer" className={btn}>
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
      <label className="flex items-center gap-1 text-xs text-fg-soft">
        <input
          type="checkbox"
          checked={cs}
          onChange={(e) => {
            setCs(e.target.checked);
            editor.commands.setSearch(query, e.target.checked);
          }}
          className="accent-[var(--accent)]"
        />
        Aa
      </label>
      <input
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor.commands.replaceCurrent(replace);
          } else if (e.key === "Escape") onClose();
        }}
        placeholder="Ersetzen durch"
        aria-label="Ersetzen durch"
        className="w-36 rounded-full border border-line bg-surface px-3 py-1 text-sm text-fg outline-none focus:border-accent"
      />
      <button type="button" onClick={() => editor.commands.replaceCurrent(replace)} disabled={total === 0} className={small}>
        Ersetzen
      </button>
      <button type="button" onClick={() => editor.commands.replaceAll(replace)} disabled={total === 0} className={small}>
        Alle ersetzen
      </button>
      <button type="button" onClick={onClose} aria-label="Schließen" className={`${btn} ml-auto`}>
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
