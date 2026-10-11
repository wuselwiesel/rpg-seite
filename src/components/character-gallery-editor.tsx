"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { addGalleryImage, deleteGalleryImage } from "@/app/characters/gallery-actions";

type Img = { id: string; image_url: string; caption: string | null };

export function GalleryEditor({ characterId, images, canEdit }: { characterId: string; images: Img[]; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Img | null>(null);
  const [, startTransition] = useTransition();

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    for (const original of files.slice(0, 6)) {
      if (!original.type.startsWith("image/")) {
        setError("Nur Bilder.");
        continue;
      }
      const file = await resizeImage(original, 1600);
      if (file.size > 5 * 1024 * 1024) {
        setError("Ein Bild ist zu groß (max. 5 MB).");
        continue;
      }
      const path = `gallery-${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file);
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const err = await addGalleryImage(characterId, data.publicUrl);
      if (err) setError(err);
    }
    setBusy(false);
  }

  return (
    <section aria-label="Bilder" className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-serif text-xl text-fg">Bilder</h2>
        {canEdit && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent">
            <ImagePlus className="h-4 w-4" strokeWidth={2} />
            {busy ? "Lade hoch..." : "Bild hinzufügen"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} disabled={busy} />
          </label>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {images.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Bilder.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.id} className="group/img relative overflow-hidden rounded-xl bg-surface-2">
              <button type="button" onClick={() => setOpen(img)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt={img.caption ?? ""} loading="lazy" className="aspect-[4/5] w-full object-cover" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  aria-label="Bild entfernen"
                  onClick={() => {
                    if (!confirm("Dieses Bild entfernen?")) return;
                    startTransition(async () => {
                      const err = await deleteGalleryImage(img.id);
                      if (err) setError(err);
                    });
                  }}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-white transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/img:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Schließen" className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.image_url} alt={open.caption ?? ""} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </section>
  );
}
