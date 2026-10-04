"use client";

import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmojiCatalog } from "./emoji-catalog";
import { EmojiUploadForm } from "./emoji-upload-form";

// Knopf + Fenster mit dem Emoji-Katalog (normale und eigene Emojis); onPick bekommt das Emoji bzw. `:name: `.
export function CustomEmojiPicker({
  onPick,
  className = "",
  direction = "up",
  open: openProp,
  onOpenChange,
  hideButton = false,
}: {
  onPick: (token: string) => void;
  className?: string;
  direction?: "up" | "down";
  // Optional von außen gesteuert (z. B. aus einem Menü); mit hideButton ohne eigenen Knopf
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean | ((cur: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
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
      {!hideButton && (
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
      )}
      {open && (
        <div
          // Am Handy als festes Fenster über der Tab-Leiste, ab sm direkt am Knopf.
          className={`fixed inset-x-3 bottom-20 z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:w-[22rem] ${
            direction === "up"
              ? "sm:bottom-full sm:mb-2"
              : "sm:top-full sm:mt-2"
          }`}
        >
          {adding ? (
            <EmojiUploadForm
              compact
              title="Neues eigenes Emoji"
              onDone={(name) => {
                // Die Emoji-Liste kommt vom Server; nach dem Neuladen wird :name: als Bild angezeigt.
                router.refresh();
                onPick(`:${name}: `);
                setAdding(false);
                setOpen(false);
              }}
            />
          ) : (
            <EmojiCatalog
              showUploadHint={false}
              onPick={(token) => {
                // Eigene Emojis bekommen ein Leerzeichen dahinter, damit man direkt weiterschreiben kann.
                onPick(token.startsWith(":") ? `${token} ` : token);
                setOpen(false);
              }}
            />
          )}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="w-full border-t border-line px-3 py-2 text-left text-xs text-accent hover:underline"
          >
            {adding
              ? "← Zurück zum Katalog"
              : "＋ Eigenes Emoji hochladen (auch per Strg+V)"}
          </button>
        </div>
      )}
    </div>
  );
}
