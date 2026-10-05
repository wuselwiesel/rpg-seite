"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { EmojiCatalog } from "./emoji-catalog";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// Kleines Fenster zum Auswählen einer Reaktion (Schnellauswahl + alle Emojis).
export function EmojiPickerDialog({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button type="button" onClick={onClose} aria-label="Schließen" className="absolute inset-0" />
      <div className="relative flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-0.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-surface-2"
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Schließen"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <EmojiCatalog onPick={onPick} height={400} />
      </div>
    </div>,
    document.body,
  );
}
