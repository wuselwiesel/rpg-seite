"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 24;

// Mehrere Bilder hochladen, Reihenfolge ändern und entfernen. Schreibt jede Adresse als <input name="gallery"> ins Formular.
export function GalleryUpload({ initial, bucket = "wiki-covers" }: { initial: string[]; bucket?: string }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    const room = MAX_IMAGES - urls.length;
    if (room <= 0) {
      setError(`Maximal ${MAX_IMAGES} Bilder.`);
      return;
    }
    const supabase = createClient();
    for (const original of files.slice(0, room)) {
      if (!original.type.startsWith("image/")) {
        setError("Nur Bilder können hochgeladen werden.");
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const file = await resizeImage(original, 1600);
        if (file.size > MAX_SIZE) {
          setError("Ein Bild ist zu groß (max. 5 MB).");
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `gallery/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
        if (upErr) {
          setError(upErr.message);
          continue;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        setUrls((cur) => [...cur, data.publicUrl]);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (files.length > room) setError(`Maximal ${MAX_IMAGES} Bilder, der Rest wurde nicht hochgeladen.`);
  }

  function move(i: number, dir: -1 | 1) {
    setUrls((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const copy = [...cur];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {urls.map((u) => (
        <input key={u} type="hidden" name="gallery" value={u} />
      ))}
      {urls.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((u, i) => (
            <li key={u} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/55 p-1 text-white">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach vorn" className="rounded p-1 disabled:opacity-30">
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button type="button" onClick={() => setUrls((cur) => cur.filter((x) => x !== u))} aria-label="Bild entfernen" className="rounded p-1">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === urls.length - 1} aria-label="Nach hinten" className="rounded p-1 disabled:opacity-30">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-sm text-accent transition hover:border-accent">
        <ImagePlus className="h-4 w-4" strokeWidth={2} />
        {busy > 0 ? "Lädt hoch …" : urls.length ? "Weitere Bilder hinzufügen" : "Bilder hochladen"}
        <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={busy > 0} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
