"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2, Video } from "lucide-react";
import { uploadPostMedia } from "@/lib/upload-media";
import { GifPicker } from "@/components/gif-picker";
import { ASPECTS, ImageCropper, canCrop } from "@/components/image-cropper";

const MAX_PHOTOS = 10;

// Fotos eines geposteten Beitrags nachträglich ändern (entfernen, Reihenfolge, hinzufügen, GIF) oder das Video tauschen.
// Schreibt den Stand als versteckte Felder (media_urls bzw. media_url) ins Formular des Beitrags.
export function PostMediaEditor({ type, initial }: { type: "image" | "video"; initial: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [gifOpen, setGifOpen] = useState(false);

  async function upload(files: File[]) {
    setBusy(true);
    setError(null);
    const added: string[] = [];
    for (const file of files) {
      const r = await uploadPostMedia(file);
      if ("error" in r) {
        setError(r.error);
        break;
      }
      added.push(r.url);
    }
    if (added.length) setUrls((cur) => (type === "image" ? [...cur, ...added].slice(0, MAX_PHOTOS) : added.slice(0, 1)));
    setBusy(false);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, type === "image" ? MAX_PHOTOS - urls.length : 1);
    e.target.value = "";
    if (files.length === 0) return;
    if (type === "image") {
      setCropQueue(files.filter(canCrop));
      const direct = files.filter((f) => !canCrop(f));
      if (direct.length) void upload(direct);
    } else void upload(files);
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

  const btn = "flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-30";
  return (
    <div className="flex flex-col gap-2">
      {type === "image" ? <input type="hidden" name="media_urls" value={JSON.stringify(urls)} /> : <input type="hidden" name="media_url" value={urls[0] ?? ""} />}
      {cropQueue.length > 0 && (
        <ImageCropper
          key={cropQueue[0].name + cropQueue.length}
          file={cropQueue[0]}
          aspects={[ASPECTS.square, ASPECTS.portrait, ASPECTS.landscape]}
          title={cropQueue.length > 1 ? `Foto zuschneiden (${cropQueue.length} übrig)` : "Foto zuschneiden"}
          onCancel={() => setCropQueue([])}
          onDone={(cropped) => {
            setCropQueue((q) => q.slice(1));
            void upload([cropped]);
          }}
        />
      )}
      {type === "image" ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {urls.map((u, i) => (
            <div key={`${u}-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-1 top-1 flex justify-between">
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach vorn" className={btn}>
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === urls.length - 1} aria-label="Nach hinten" className={btn}>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </span>
                <button type="button" onClick={() => setUrls((cur) => cur.filter((_, k) => k !== i))} disabled={urls.length <= 1} aria-label="Foto entfernen" className={btn}>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
          {urls.length < MAX_PHOTOS && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-muted transition hover:bg-surface-2 hover:text-fg">
              <ImagePlus className="h-5 w-5" strokeWidth={2} />
              <span className="text-xs">{busy ? "Lädt …" : "Foto"}</span>
              <input type="file" accept="image/*,.heic,.heif" multiple onChange={pick} className="hidden" />
            </label>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-fg-soft">
          <Video className="h-4 w-4" strokeWidth={2} />
          <label className="cursor-pointer rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium transition hover:text-fg">
            {busy ? "Lädt hoch …" : "Video ersetzen"}
            <input type="file" accept="video/*" onChange={pick} className="hidden" />
          </label>
          {urls[0] !== initial[0] && <span className="text-xs text-muted">Neues Video gewählt</span>}
        </div>
      )}
      {type === "image" && urls.length < MAX_PHOTOS && (
        <div className="relative">
          <button type="button" onClick={() => setGifOpen((v) => !v)} aria-expanded={gifOpen} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold tracking-wide text-fg-soft transition hover:text-fg">
            GIF hinzufügen
          </button>
          {gifOpen && (
            <div className="absolute left-0 top-full z-30 mt-2 w-full sm:w-auto">
              <GifPicker
                onPick={(url) => {
                  setUrls((cur) => [...cur, url].slice(0, MAX_PHOTOS));
                  setGifOpen(false);
                }}
                onClose={() => setGifOpen(false)}
              />
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
