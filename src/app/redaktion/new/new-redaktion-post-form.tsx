"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createRedaktionPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { GifPicker } from "@/components/gif-picker";
import { useDraft } from "@/lib/use-draft";
import { uploadPostMedia } from "@/lib/upload-media";
import type { Character } from "@/lib/types";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

export function NewRedaktionPostForm({ mentionCharacters }: { mentionCharacters: Character[] }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(createRedaktionPost, null);
  const { draft, restored, update, clear } = useDraft("draft:redaktion-new", { content: "" });
  const wasPending = useRef(false);

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);

  const [pollEnabled, setPollEnabled] = useState(false);
  const [characterMode, setCharacterMode] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [showVoters, setShowVoters] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  useEffect(() => {
    if (wasPending.current && !pending && !error) router.push("/redaktion");
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const result = await uploadPostMedia(file);
    setUploading(false);
    if ("error" in result) {
      setUploadError(result.error);
      return;
    }
    setImageUrl(result.url);
  }

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function addOption() {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ""] : prev));
  }

  function removeOption(i: number) {
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, idx) => idx !== i) : prev));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-4 font-serif text-3xl text-fg">Neuer Redaktions-Beitrag</h1>
      <p className="mb-5 text-sm text-fg-soft">
        Sichtbar für dich und deine Freund:innen - unabhängig von Charakteren und Welten.
      </p>

      <form action={formAction} onSubmit={() => clear()} className="flex flex-col gap-4">
        <input type="hidden" name="image_url" value={imageUrl} />
        <input type="hidden" name="poll_character_mode" value={pollEnabled && characterMode ? "on" : ""} />
        <input type="hidden" name="poll_multi_select" value={pollEnabled ? (multiSelect ? "on" : "") : ""} />
        <input type="hidden" name="poll_show_voters" value={pollEnabled ? (showVoters ? "on" : "") : ""} />
        <input type="hidden" name="poll_closes_at" value={pollEnabled ? closesAt : ""} />

        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          Inhalt
          {restored && (
            <RichTextEditor
              key="restored"
              name="content"
              initialContent={draft.content}
              onChange={(html) => update({ content: html })}
              mentionCharacters={mentionCharacters}
              allowFontSelection
              placeholder="Was gibt's Neues?"
            />
          )}
        </div>

        {imageUrl ? (
          <div className="relative w-fit max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="max-h-[50dvh] max-w-full rounded-lg object-contain" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              aria-label="Bild entfernen"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold tracking-wide text-fg-soft transition hover:text-fg">
              {uploading ? "Lädt..." : "Bild hinzufügen"}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setGifOpen((v) => !v)}
                aria-expanded={gifOpen}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold tracking-wide text-fg-soft transition hover:text-fg"
              >
                GIF hinzufügen
              </button>
              {gifOpen && (
                <div className="absolute left-0 top-full z-30 mt-2 w-full sm:w-auto">
                  <GifPicker
                    onPick={(url) => {
                      setImageUrl(url);
                      setGifOpen(false);
                    }}
                    onClose={() => setGifOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}

        <div className="rounded-xl border border-line bg-surface p-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-fg">
            <input
              type="checkbox"
              checked={pollEnabled}
              onChange={(e) => setPollEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-strong)]"
            />
            Umfrage hinzufügen
          </label>

          {pollEnabled && (
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-fg-soft">
                <input
                  type="checkbox"
                  checked={characterMode}
                  onChange={(e) => setCharacterMode(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-strong)]"
                />
                Charakter-Umfrage (Optionen = alle Charaktere von dir &amp; Freund:innen)
              </label>

              {!characterMode && (
                <div className="flex flex-col gap-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        name="poll_option"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        maxLength={200}
                        className="flex-1 rounded-md border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                      />
                      {options.length > MIN_OPTIONS && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          aria-label="Option entfernen"
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  ))}
                  {options.length < MAX_OPTIONS && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex w-fit items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      Option hinzufügen
                    </button>
                  )}
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 text-sm text-fg-soft">
                <input
                  type="checkbox"
                  checked={multiSelect}
                  onChange={(e) => setMultiSelect(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-strong)]"
                />
                Mehrfachauswahl erlauben
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-fg-soft">
                <input
                  type="checkbox"
                  checked={showVoters}
                  onChange={(e) => setShowVoters(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-strong)]"
                />
                Namen der Abstimmenden anzeigen
              </label>
              <label className="flex flex-col gap-1 text-sm text-fg-soft">
                Schließt am (optional)
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="w-fit rounded-md border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
              </label>
              <p className="text-xs text-muted">
                Ergebnisse sind für andere erst sichtbar, nachdem sie selbst abgestimmt haben - du als Ersteller:in siehst sie immer.
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending || uploading}
          className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichere..." : "Veröffentlichen"}
        </button>
      </form>
    </div>
  );
}
