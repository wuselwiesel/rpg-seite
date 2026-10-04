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
  children,
  label = "Emojis",
}: {
  onPick: (token: string) => void;
  className?: string;
  direction?: "up" | "down";
  // Optional von außen gesteuert (z. B. aus einem Menü); mit hideButton ohne eigenen Knopf
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
  // Eigener Inhalt im Knopf (statt des Symbols) und seine Beschriftung
  children?: React.ReactNode;
  label?: string;
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
  // Ab sm sitzt das Fenster fest am Bildschirm (position: fixed), damit es in Dialogen nicht unten abgeschnitten wird.
  const [place, setPlace] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpenState(false);
      onOpenChange?.(false);
    };
    const onDown = (e: PointerEvent) =>
      !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  function toggle() {
    if (open) return setOpen(false);
    const rect = ref.current?.getBoundingClientRect();
    if (rect && window.matchMedia("(min-width: 640px)").matches) {
      const margin = 12;
      const wanted = 480;
      const width = Math.min(352, window.innerWidth - 2 * margin);
      const below = window.innerHeight - rect.bottom - margin - 8;
      const above = rect.top - margin - 8;
      const down =
        direction === "down"
          ? below >= wanted || below >= above
          : !(above >= wanted || above >= below);
      setPlace({
        left: Math.max(
          margin,
          Math.min(rect.left, window.innerWidth - width - margin),
        ),
        ...(down
          ? { top: rect.bottom + 8 }
          : { bottom: window.innerHeight - rect.top + 8 }),
        maxHeight: Math.max(240, Math.min(wanted, down ? below : above)),
      });
    } else setPlace(null);
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      {!hideButton && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          aria-expanded={open}
          title={label}
          aria-label={label}
          className={
            className ||
            "flex h-full items-center justify-center rounded-md border border-line px-2.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          }
        >
          {children ?? <SmilePlus className="h-5 w-5" strokeWidth={1.75} />}
        </button>
      )}
      {open && (
        <div
          // Am Handy als festes Fenster über der Tab-Leiste, ab sm fest am Bildschirm neben dem Knopf (bleibt vollständig sichtbar).
          className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg ${place ? "w-[22rem] max-w-[calc(100vw-1.5rem)]" : "inset-x-3 bottom-20 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:w-[22rem]"}`}
          style={
            place
              ? {
                  left: place.left,
                  top: place.top,
                  bottom: place.bottom,
                  maxHeight: place.maxHeight,
                }
              : undefined
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
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
          </div>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="w-full shrink-0 border-t border-line px-3 py-2 text-left text-xs text-accent hover:underline"
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
