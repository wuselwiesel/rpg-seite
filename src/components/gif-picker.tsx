"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { normalizeGifUrl, type GifResult } from "@/lib/gif";

// Auswahl-Fenster für GIFs: Suche (mit Giphy/Tenor-Schlüssel) oder ein eingefügter GIF-Link.
export function GifPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gif-search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = (await res.json()) as { configured: boolean; results: GifResult[] };
        setConfigured(json.configured);
        setResults(json.results);
      } catch {
        /* abgebrochen oder offline */
      }
      setLoading(false);
    }, q ? 350 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function submitLink() {
    const url = normalizeGifUrl(link);
    if (!url) {
      setLinkError("Bitte einen Link von giphy.com oder tenor.com einfügen (direkter GIF-Link).");
      return;
    }
    onPick(url);
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="GIF auswählen"
      className="z-40 flex max-h-[70dvh] w-full flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg sm:w-[26rem]"
    >
      <div className="flex items-center gap-2">
        {configured !== false && (
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="GIF suchen, z. B. Katze"
              className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none sm:text-sm"
              autoFocus
            />
          </label>
        )}
        {configured === false && <p className="flex-1 text-sm font-medium text-fg">GIF einfügen</p>}
        <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {configured === true && (
        <div className="grid min-h-24 grid-cols-3 gap-1.5 overflow-y-auto">
          {results.map((g) => (
            <button key={g.id} type="button" onClick={() => onPick(g.url)} title={g.title} className="aspect-square overflow-hidden rounded-lg bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.preview} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
          {!loading && results.length === 0 && <p className="col-span-3 py-4 text-center text-sm text-muted">Nichts gefunden.</p>}
        </div>
      )}

      {configured === false && (
        <p className="text-xs text-muted">
          Die GIF-Suche ist noch nicht eingerichtet. Du kannst einen GIF-Link von giphy.com oder tenor.com einfügen oder eine
          GIF-Datei hochladen.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkError(null);
            }}
            placeholder="GIF-Link einfügen"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitLink();
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-line bg-app px-3 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm"
          />
          <button type="button" onClick={submitLink} disabled={!link} className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong disabled:opacity-50">
            Nehmen
          </button>
        </div>
        {linkError && <p className="text-xs text-red-600 dark:text-red-400">{linkError}</p>}
        {configured === true && <p className="text-[11px] text-muted">GIFs von GIPHY / Tenor</p>}
      </div>
    </div>
  );
}
