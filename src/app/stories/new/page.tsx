"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createStory } from "../actions";
import { STORY_BACKGROUNDS, STORY_DURATIONS, storyBackground } from "@/lib/stories";

const MAX_SIZE = 5 * 1024 * 1024;

export default function NewStoryPage() {
  const [error, formAction, pending] = useActionState(createStory, null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [bg, setBg] = useState(STORY_BACKGROUNDS[0].id);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setUploadError("Bild ist zu groß (max. 5 MB).");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const path = `stories/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error: err } = await supabase.storage.from("chat-media").upload(path, file);
    if (err) setUploadError(err.message);
    else setImageUrl(supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl);
    setUploading(false);
  }

  const darkBg = bg === "night" || bg === "ocean" || bg === "forest";

  return (
    <div className="mx-auto max-w-md px-4 py-4 sm:py-10">
      <div className="mb-4 flex items-center gap-1">
        <Link
          href="/"
          aria-label="Zurück"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2} />
        </Link>
        <h1 className="font-serif text-3xl text-fg">Neue Story</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="image_url" value={imageUrl} />
        <input type="hidden" name="bg" value={bg} />

        <div
          className="relative mx-auto flex aspect-[9/16] max-h-[52dvh] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl border border-line"
          style={imageUrl ? { background: "#000" } : { background: storyBackground(bg) }}
        >
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Vorschau" className="absolute inset-0 h-full w-full object-contain" />
          )}
          {text && (
            <p
              className={`relative whitespace-pre-line break-words px-5 text-center font-serif text-xl leading-snug ${
                imageUrl ? "absolute bottom-6 rounded-xl bg-black/55 py-2 text-white" : darkBg ? "text-white" : "text-neutral-900"
              }`}
            >
              {text}
            </p>
          )}
          {!imageUrl && !text && <p className="px-6 text-center text-sm text-neutral-700/70">Vorschau</p>}
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              aria-label="Bild entfernen"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm font-medium text-fg-soft transition hover:bg-surface-2">
            <ImagePlus className="h-4 w-4" strokeWidth={2} />
            {uploading ? "Lädt hoch..." : imageUrl ? "Anderes Bild wählen" : "Bild hinzufügen"}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}

          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            {imageUrl ? "Text auf dem Bild (optional)" : "Text"}
            <textarea
              name="text_content"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
            />
          </label>

          {!imageUrl && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hintergrund">
              {STORY_BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={bg === b.id}
                  aria-label={`Hintergrund ${b.id}`}
                  onClick={() => setBg(b.id)}
                  className={`h-9 w-9 rounded-full border-2 ${bg === b.id ? "border-fg" : "border-transparent"}`}
                  style={{ background: b.css }}
                />
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Sichtbar für
            <select
              name="hours"
              defaultValue={24}
              className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
            >
              {STORY_DURATIONS.map((d) => (
                <option key={d.hours} value={d.hours}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending || uploading || (!imageUrl && !text.trim())}
          className="rounded-md bg-accent-strong px-5 py-2.5 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Veröffentliche..." : "Story teilen"}
        </button>
      </form>
    </div>
  );
}
