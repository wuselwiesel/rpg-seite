"use client";

import { useState } from "react";
import { CustomEmojiPicker } from "./custom-emoji-picker";
import { EmojiText } from "./custom-emoji-provider";
import { NameSymbol } from "./name-symbol";
import { checkColor, cleanNameSymbol, DEFAULT_CHECK_COLOR, isCheckSymbol, makeCheck } from "@/lib/name-symbol";

const CHECK_COLORS = ["#0ea5e9", "#22c55e", "#a855f7", "#ec4899", "#f59e0b", "#ef4444", "#64748b"];

// Auswahl des Zeichens neben dem Namen (alle Emojis, Symbole und die eigenen der Welt); schreibt `name_symbol` ins Formular.
// allowBlueCheck: nur beim Konto (Redaktions-Profil) wählbar, nicht bei Charakteren
export function NameSymbolField({ initial, allowBlueCheck = false }: { initial?: string | null; allowBlueCheck?: boolean }) {
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
          {symbol ? <NameSymbol symbol={symbol} /> : <span className="text-sm text-muted">–</span>}
        </span>
        <CustomEmojiPicker
          direction="down"
          onPick={(token) => setSymbol(cleanNameSymbol(token, allowBlueCheck))}
          className="flex h-10 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        />
        {allowBlueCheck && (
          <button type="button" onClick={() => setSymbol(makeCheck(DEFAULT_CHECK_COLOR))} aria-pressed={isCheckSymbol(symbol)} className="flex h-10 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg aria-pressed:border-accent aria-pressed:text-fg">
            <NameSymbol symbol={makeCheck(DEFAULT_CHECK_COLOR)} />
            Haken
          </button>
        )}
        {symbol && (
          <button type="button" onClick={() => setSymbol("")} className="text-xs text-muted hover:text-fg">
            Entfernen
          </button>
        )}
      </div>
      {allowBlueCheck && isCheckSymbol(symbol) && (
        <div role="group" aria-label="Farbe des Hakens" className="flex flex-wrap items-center gap-1.5">
          {CHECK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSymbol(makeCheck(c))}
              aria-label={`Farbe ${c}`}
              aria-pressed={checkColor(symbol) === c}
              className="h-7 w-7 rounded-full border-2 border-transparent ring-1 ring-line transition aria-pressed:border-surface aria-pressed:ring-2 aria-pressed:ring-accent"
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 text-xs text-fg-soft hover:bg-surface-2">
            Eigene
            <input type="color" value={checkColor(symbol)} onChange={(e) => setSymbol(makeCheck(e.target.value))} aria-label="Eigene Farbe wählen" className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
          </label>
        </div>
      )}
      <span className="text-xs text-muted">Erscheint neben deinem Namen im Profil, bei Beiträgen und Kommentaren.</span>
    </div>
  );
}
