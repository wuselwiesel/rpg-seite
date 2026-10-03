"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAP_MAX_BYTES, prepareMapImage } from "@/lib/map-image";
import { createWikiMap } from "./actions";

const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function NewMapForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Bitte wähle ein Bild.");
    setError(null);
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Bitte wähle ein Kartenbild.");
    setBusy(true);
    setError(null);
    try {
      // Karten dürfen groß sein, damit man hineinzoomen kann (bis 6000 Pixel, PNG bleibt verlustfrei).
      const resized = await prepareMapImage(file);
      if (resized.size > MAP_MAX_BYTES) throw new Error("Das Bild ist zu groß (max. 25 MB). Speichere es als JPEG oder in kleinerer Größe.");
      const supabase = createClient();
      const ext = resized.name.split(".").pop() || "jpg";
      const path = `maps/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("wiki-covers").upload(path, resized);
      if (upErr) throw new Error(upErr.message);
      const imageUrl = supabase.storage.from("wiki-covers").getPublicUrl(path).data.publicUrl;
      const res = await createWikiMap({ title, description, imageUrl });
      if (!res.ok) throw new Error(res.error);
      router.push(`/wiki/karten/${res.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 @xl:p-6">
      <h2 className="font-serif text-2xl text-fg">Neue Karte</h2>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-line bg-app p-4 text-sm text-muted transition hover:border-accent">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vorschau der Karte" className="max-h-60 rounded-lg object-contain" />
        ) : (
          <>
            <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
            Kartenbild wählen
          </>
        )}
        <input type="file" accept="image/*" onChange={pick} className="sr-only" aria-label="Kartenbild wählen" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Name
        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="z. B. Weltkarte" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Beschreibung (optional)
        <input maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div>
        <button type="submit" disabled={busy} className="rounded-lg bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {busy ? "Lade hoch …" : "Karte anlegen"}
        </button>
      </div>
    </form>
  );
}
