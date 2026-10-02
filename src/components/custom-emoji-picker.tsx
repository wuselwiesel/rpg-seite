"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sticker } from "lucide-react";
import { useEmojiMap } from "./custom-emoji-provider";

// Knopf + kleines Fenster mit den eigenen Emojis; fügt :name: ein (onPick bekommt den Text).
export function CustomEmojiPicker({
  onPick,
  className = "",
  direction = "up",
}: {
  onPick: (token: string) => void;
  className?: string;
  direction?: "up" | "down";
}) {
  const map = useEmojiMap();
  const names = Object.keys(map).sort();
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
        title="Eigene Emojis"
        aria-label="Eigene Emojis"
        className={
          className ||
          "flex h-full items-center justify-center rounded-md border border-line px-2.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        }
      >
        <Sticker className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          className={`absolute z-50 w-64 max-w-[80vw] rounded-2xl border border-line bg-surface p-2 shadow-lg ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } left-0`}
        >
          {names.length === 0 ? (
            <p className="p-2 text-xs text-muted">
              Noch keine eigenen Emojis in dieser Welt.{" "}
              <Link href="/profile/emojis" className="text-accent hover:underline">
                Emoji hochladen
              </Link>
            </p>
          ) : (
            <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(`:${name}: `);
                    setOpen(false);
                  }}
                  title={`:${name}:`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={map[name]} alt={`:${name}:`} className="h-7 w-7 object-contain" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
