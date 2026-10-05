"use client";

import { useState } from "react";
import { Music, X } from "lucide-react";
import { parseMusicLink } from "@/lib/scene-music";

// Musik der Szene: ein Knopf; der Player (und damit die fremde Seite) wird erst nach dem Klick geladen.
export function SceneMusic({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const link = parseMusicLink(url);
  if (!link) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft transition hover:text-accent"
      >
        {open ? <X className="h-3 w-3" strokeWidth={2} /> : <Music className="h-3 w-3" strokeWidth={2} />}
        {open ? "Musik schließen" : "Musik"}
      </button>
      {open && (
        <div className="basis-full">
          {link.kind === "audio" ? (
            <audio src={link.src} controls autoPlay className="w-full" />
          ) : (
            <iframe
              src={link.embed}
              title={`Musik (${link.label})`}
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              className={`w-full rounded-xl border-0 ${link.kind === "youtube" ? "aspect-video" : "h-24"}`}
            />
          )}
        </div>
      )}
    </>
  );
}
