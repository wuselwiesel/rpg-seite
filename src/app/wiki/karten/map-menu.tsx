"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAP_MAX_BYTES, prepareMapImage } from "@/lib/map-image";
import { deleteWikiMap, updateWikiMap } from "./actions";

const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

type MapInfo = { id: string; title: string; description: string | null; image_url: string };

// Karte bearbeiten (Name, Beschreibung, Bild austauschen) und löschen. card: ⋯ in der Ecke einer Kartenkachel; header: zwei Knöpfe auf der Kartenseite.
export function MapMenu({ map, canDelete, variant }: { map: MapInfo; canDelete: boolean; variant: "card" | "header" }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const item = "block w-full px-3.5 py-2 text-left text-sm text-fg transition hover:bg-surface-2";
  return (
    <>
      {variant === "header" ? (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setDialog("edit")} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg">
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            Bearbeiten
          </button>
          {canDelete && (
            <button type="button" onClick={() => setDialog("delete")} title="Karte löschen" aria-label="Karte löschen" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-red-500">
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      ) : (
        <div ref={ref} className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label={`Menü für ${map.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-fg-soft shadow ring-1 ring-line backdrop-blur transition hover:text-fg"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); setDialog("edit"); }}>
                Bearbeiten
              </button>
              {canDelete && (
                <button role="menuitem" type="button" className={`${item} text-red-600 dark:text-red-400`} onClick={() => { setMenu(false); setDialog("delete"); }}>
                  Löschen
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {dialog === "edit" && <EditDialog map={map} onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteDialog map={map} onClose={() => setDialog(null)} />}
    </>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="my-4 flex w-full max-w-md flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <h2 className="font-serif text-xl text-fg">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function EditDialog({ map, onClose }: { map: MapInfo; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(map.title);
  const [description, setDescription] = useState(map.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(map.image_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Bitte wähle ein Bild.");
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const resized = await prepareMapImage(file);
        if (resized.size > MAP_MAX_BYTES) throw new Error("Das Bild ist zu groß (max. 25 MB). Speichere es als JPEG oder in kleinerer Größe.");
        const supabase = createClient();
        const ext = resized.name.split(".").pop() || "jpg";
        const path = `maps/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("wiki-covers").upload(path, resized);
        if (upErr) throw new Error(upErr.message);
        imageUrl = supabase.storage.from("wiki-covers").getPublicUrl(path).data.publicUrl;
      }
      const res = await updateWikiMap(map.id, { title, description, imageUrl });
      if (!res.ok) throw new Error(res.error);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <Shell title="Karte bearbeiten" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-xl border border-dashed border-line bg-app p-3 text-sm text-muted transition hover:border-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vorschau der Karte" className="max-h-44 rounded-lg object-contain" />
          <span className="flex items-center gap-1.5">
            <ImagePlus className="h-4 w-4" strokeWidth={2} />
            Anderes Kartenbild wählen
          </span>
          <input type="file" accept="image/*" onChange={pick} className="sr-only" aria-label="Anderes Kartenbild wählen" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Name
          <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Beschreibung (optional)
          <textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2">
            Abbrechen
          </button>
          <button type="submit" disabled={busy || !title.trim()} className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            {busy ? "Speichere …" : "Speichern"}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function DeleteDialog({ map, onClose }: { map: MapInfo; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    const res = await deleteWikiMap(map.id);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.push("/wiki/karten");
    router.refresh();
    onClose();
  }
  return (
    <Shell title={`„${map.title}“ löschen`} onClose={onClose}>
      <p className="text-sm text-fg-soft">Die Karte wird mit allen Pins gelöscht. Wiki-Seiten, auf die die Pins zeigen, bleiben unverändert.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2">
          Abbrechen
        </button>
        <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
          {busy ? "…" : "Löschen"}
        </button>
      </div>
    </Shell>
  );
}
