"use client";

import { useState } from "react";
import { CustomEmojiPicker } from "./custom-emoji-picker";
import { EmojiText } from "./custom-emoji-provider";
import { cleanNameSymbol } from "@/lib/name-symbol";

// Auswahl des Zeichens neben dem Namen (alle Emojis, Symbole und die eigenen der Welt); schreibt `name_symbol` ins Formular.
export function NameSymbolField({ initial }: { initial?: string | null }) {
  const [symbol, setSymbol] = useState(initial ?? "");
  return (
    <div className="flex flex-col gap-1 text-sm text-fg-soft">
      Zeichen neben dem Namen (optional)
      <input type="hidden" name="name_symbol" value={symbol} />
      <div className="flex items-center gap-2">
        <span
          className="flex h-10 min-w-10 items-center justify-center rounded-md border border-line bg-surface px-2 text-xl text-fg"
          aria-label={symbol ? "Gewähltes Zeichen" : "Kein Zeichen gewählt"}
        >
          {symbol ? <EmojiText text={symbol} /> : <span className="text-sm text-muted">–</span>}
        </span>
        <CustomEmojiPicker
          direction="down"
          onPick={(token) => setSymbol(cleanNameSymbol(token))}
          className="flex h-10 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        />
        {symbol && (
          <button type="button" onClick={() => setSymbol("")} className="text-xs text-muted hover:text-fg">
            Entfernen
          </button>
        )}
      </div>
      <span className="text-xs text-muted">Erscheint neben deinem Namen im Profil, bei Beiträgen und Kommentaren.</span>
    </div>
  );
}
