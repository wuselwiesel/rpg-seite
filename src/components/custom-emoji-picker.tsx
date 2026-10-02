"use client";

import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { EmojiCatalog } from "./emoji-catalog";

// Knopf + Fenster mit dem Emoji-Katalog (normale und eigene Emojis); onPick bekommt das Emoji bzw. `:name: `.
export function CustomEmojiPicker({
  onPick,
  className = "",
  direction = "up",
}: {
  onPick: (token: string) => void;
  className?: string;
  direction?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Emojis"
        aria-label="Emojis"
        className={
          className ||
          "flex h-full items-center justify-center rounded-md border border-line px-2.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        }
      >
        <SmilePlus className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          // Am Handy als festes Fenster über der Tab-Leiste, ab sm direkt am Knopf.
          className={`fixed inset-x-3 bottom-20 z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:w-[22rem] ${
            direction === "up" ? "sm:bottom-full sm:mb-2" : "sm:top-full sm:mt-2"
          }`}
        >
          <EmojiCatalog
            onPick={(token) => {
              // Eigene Emojis bekommen ein Leerzeichen dahinter, damit man direkt weiterschreiben kann.
              onPick(token.startsWith(":") ? `${token} ` : token);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
