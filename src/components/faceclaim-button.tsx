"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ImagePlus, Lock, ScanFace, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { saveFaceclaim, type Faceclaim } from "@/app/characters/faceclaim-actions";

const MAX_IMAGES = 8;
const MAX_SIZE = 5 * 1024 * 1024;

// Unscheinbarer Knopf (nur du siehst ihn): öffnet ein kleines Fenster für das eigene Faceclaim eines Charakters.
export function FaceclaimButton({ characterId, initial, className = "" }: { characterId: string; initial: Faceclaim; className?: string }) {
  const [saved, setSaved] = useState<Faceclaim>(initial);
  const [open, setOpen] = useState(false);
  const filled = Boolean(saved.name || saved.link || saved.images.length);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={filled ? `Faceclaim (nur für dich): ${saved.name || "Bilder"}` : "Faceclaim (nur für dich)"}
        aria-label="Faceclaim, nur für dich"
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition hover:bg-surface-2 hover:text-fg ${filled ? "text-fg-soft" : "text-muted/70"} ${className}`}
      >
        <ScanFace className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {saved.name && <span className="max-w-[10rem] truncate">{saved.name}</span>}
      </button>
      {open && (
        <FaceclaimDialog
          characterId={characterId}
          initial={saved}
          onClose={() => setOpen(false)}
          onSaved={(f) => {
            setSaved(f);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function FaceclaimDialog({ characterId, initial, onClose, onSaved }: { characterId: string; initial: Faceclaim; onClose: () => void; onSaved: (f: Faceclaim) => void }) {
  const [name, setName] = useState(initial.name);
  const [link, setLink] = useState(initial.link);
  const [images, setImages] = useState<string[]>(initial.images);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    const supabase = createClient();
    for (const original of files.slice(0, MAX_IMAGES - images.length)) {
      if (!original.type.startsWith("image/") && !/\.(heic|heif)$/i.test(original.name)) {
        setError("Nur Bilder können hochgeladen werden.");
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const file = await resizeImage(original, 1200);
        if (file.size > MAX_SIZE) {
          setError("Ein Bild ist zu groß (max. 5 MB).");
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `faceclaim/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, file);
        if (upErr) {
          setError(upErr.message);
          continue;
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setImages((cur) => [...cur, data.publicUrl].slice(0, MAX_IMAGES));
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  function save() {
    setError(null);
    start(async () => {
      const next = { name: name.trim(), link: link.trim(), images };
      const err = await saveFaceclaim(characterId, next);
      if (err) setError(err);
      else onSaved(next);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Faceclaim" onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            <ScanFace className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
            Faceclaim
            <Lock className="h-3.5 w-3.5 text-muted" strokeWidth={2} aria-label="Nur für dich" />
          </h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Name der Person" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
          <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="Link (z. B. Pinterest-Board)" inputMode="url" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
          {link.trim() && (
            <a href={/^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-xs text-muted hover:text-fg">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              Link öffnen
            </a>
          )}
          <div className="grid grid-cols-4 gap-2">
            {images.map((u) => (
              <div key={u} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Bild entfernen" onClick={() => setImages((cur) => cur.filter((x) => x !== u))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition hover:bg-black/80">
                  <Trash2 className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-muted transition hover:bg-surface-2 hover:text-fg">
                <ImagePlus className="h-5 w-5" strokeWidth={2} />
                <span className="sr-only">Bilder hinzufügen</span>
                <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" onChange={addFiles} />
              </label>
            )}
          </div>
          {busy > 0 && <p className="text-xs text-muted">Lädt hoch …</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:bg-surface-2">
            Abbrechen
          </button>
          <button type="button" onClick={save} disabled={pending || busy > 0} className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            Speichern
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
