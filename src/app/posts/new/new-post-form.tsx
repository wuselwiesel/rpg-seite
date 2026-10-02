"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Film, ImageIcon, Plus, Type, X } from "lucide-react";
import { createPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDraft } from "@/lib/use-draft";
import { uploadPostMedia } from "@/lib/upload-media";
import { GifPicker } from "@/components/gif-picker";
import { TagPeople } from "@/components/tag-people";
import { ASPECTS, ImageCropper, canCrop } from "@/components/image-cropper";
import type { Character } from "@/lib/types";

type Kind = "text" | "image" | "video";

const MAX_PHOTOS = 10;

const KINDS: { id: Kind; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Foto", icon: ImageIcon },
  { id: "video", label: "Video", icon: Film },
];

export function NewPostForm({ storyPosts, people }: { storyPosts: { id: string; title: string }[]; people: Character[] }) {
  const [error, formAction, pending] = useActionState(createPost, null);
  const { draft, restored, update, clear } = useDraft("draft:post-new", { content: "", caption: "" });
  const [kind, setKind] = useState<Kind>("text");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const mediaUrl = mediaUrls[0] ?? "";
  const [scheduled, setScheduled] = useState(false);
  const [publishLocal, setPublishLocal] = useState("");
  const [minLocal, setMinLocal] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function switchKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setMediaUrls([]);
    setUploadError(null);
  }

  // Fotos werden nacheinander im Zuschneide-Fenster angezeigt; Videos und GIFs gehen direkt hoch.
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [gifOpen, setGifOpen] = useState(false);

  async function uploadFiles(files: File[]) {
    setUploading(true);
    setUploadError(null);
    const added: string[] = [];
    for (const file of files) {
      const result = await uploadPostMedia(file);
      if ("error" in result) {
        setUploadError(result.error);
        break;
      }
      added.push(result.url);
    }
    if (added.length) setMediaUrls((prev) => (kind === "image" ? [...prev, ...added] : added));
    setUploading(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - (kind === "image" ? mediaUrls.length : 0));
    e.target.value = "";
    if (files.length === 0) return;
    if (kind === "image") {
      const direct = files.filter((f) => !canCrop(f));
      setCropQueue(files.filter(canCrop));
      if (direct.length) void uploadFiles(direct);
    } else {
      void uploadFiles(files);
    }
  }

  const publishIso = scheduled && publishLocal ? new Date(publishLocal).toISOString() : "";
  const scheduleInvalid = scheduled && (!publishLocal || publishLocal < minLocal);
  const canSubmit = (kind === "text" ? true : mediaUrls.length > 0) && !scheduleInvalid;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-6 sm:py-10">
      <h1 className="mb-4 font-serif text-3xl text-fg">Neuer Beitrag</h1>

      <div className="mb-5 flex gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Art des Beitrags">
        {KINDS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            onClick={() => switchKind(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              kind === id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg-soft"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* createPost redirect()s on success, which navigates away before any
          pending/error transition would fire client-side - so the draft is
          cleared optimistically on submit rather than after confirmation. */}
      {cropQueue.length > 0 && (
        <ImageCropper
          key={cropQueue[0].name + cropQueue.length}
          file={cropQueue[0]}
          aspects={[ASPECTS.square, ASPECTS.portrait, ASPECTS.landscape]}
          title={cropQueue.length > 1 ? `Foto zuschneiden (${cropQueue.length} übrig)` : "Foto zuschneiden"}
          onCancel={() => setCropQueue([])}
          onDone={(cropped) => {
            setCropQueue((q) => q.slice(1));
            void uploadFiles([cropped]);
          }}
        />
      )}

      <form action={formAction} onSubmit={() => clear()} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="media_urls" value={JSON.stringify(kind === "image" ? mediaUrls : [])} />
        <input type="hidden" name="publish_at" value={publishIso} />

        {kind === "text" ? (
          <div className="flex flex-col gap-1 text-sm text-fg-soft">
            Inhalt
            {restored && (
              <RichTextEditor
                key="restored"
                name="content"
                initialContent={draft.content}
                onChange={(html) => update({ content: html })}
                allowFontSelection
              />
            )}
          </div>
        ) : (
          <>
            {mediaUrls.length > 0 ? (
              <div className="flex flex-col gap-2">
                {kind === "video" ? (
                  <div className="relative overflow-hidden rounded-xl bg-black">
                    <video src={mediaUrl} controls playsInline className="max-h-[60dvh] w-full" />
                    <button
                      type="button"
                      onClick={() => setMediaUrls([])}
                      aria-label="Entfernen"
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className={mediaUrls.length === 1 ? "flex flex-col" : "grid grid-cols-3 gap-1.5"}>
                    {mediaUrls.map((url, i) => (
                      <div
                        key={url}
                        className={`relative overflow-hidden rounded-lg bg-surface-2 ${mediaUrls.length === 1 ? "w-fit max-w-full" : "aspect-square"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className={mediaUrls.length === 1 ? "max-h-[60dvh] max-w-full object-contain" : "h-full w-full object-cover"}
                        />
                        <button
                          type="button"
                          onClick={() => setMediaUrls((prev) => prev.filter((u) => u !== url))}
                          aria-label={`Foto ${i + 1} entfernen`}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                    {mediaUrls.length < MAX_PHOTOS && (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-fg-soft transition hover:bg-surface-2">
                        <Plus className="h-6 w-6" strokeWidth={2} />
                        <span className="text-xs">{uploading ? "Lädt..." : "Foto"}</span>
                        <input type="file" accept="image/*" multiple onChange={handleFile} className="hidden" />
                      </label>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-14 text-center text-fg-soft transition hover:bg-surface-2">
                {kind === "image" ? <ImageIcon className="h-8 w-8" strokeWidth={1.5} /> : <Film className="h-8 w-8" strokeWidth={1.5} />}
                <span className="text-sm font-medium">
                  {uploading ? "Lädt hoch..." : kind === "image" ? "Fotos auswählen" : "Video auswählen"}
                </span>
                <span className="text-xs text-muted">{kind === "video" ? "bis 50 MB" : `bis zu ${MAX_PHOTOS} Fotos`}</span>
                <input
                  type="file"
                  accept={kind === "image" ? "image/*" : "video/*"}
                  multiple={kind === "image"}
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            )}
            {kind === "image" && mediaUrls.length < MAX_PHOTOS && (
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
                        setMediaUrls((prev) => [...prev, url].slice(0, MAX_PHOTOS));
                        setGifOpen(false);
                      }}
                      onClose={() => setGifOpen(false)}
                    />
                  </div>
                )}
              </div>
            )}
            {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              Bildunterschrift (optional)
              <textarea
                name="content"
                value={draft.caption}
                onChange={(e) => update({ caption: e.target.value })}
                rows={3}
                maxLength={2000}
                className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
              />
            </label>
          </>
        )}

        <TagPeople people={people} />

        {storyPosts.length > 0 && (
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Aus der Story verlinken (optional)
            <select
              name="story_post_id"
              defaultValue=""
              className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
            >
              <option value="">Keine Verknüpfung</option>
              {storyPosts.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="rounded-xl border border-line bg-surface p-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-fg">
            <input
              type="checkbox"
              checked={scheduled}
              onChange={(e) => {
                setScheduled(e.target.checked);
                // frühester Zeitpunkt: in einer Minute, im lokalen Format der Eingabe (JJJJ-MM-TTThh:mm)
                const soon = new Date(Date.now() + 60_000);
                soon.setMinutes(soon.getMinutes() - soon.getTimezoneOffset());
                setMinLocal(soon.toISOString().slice(0, 16));
              }}
              className="h-4 w-4 accent-[var(--accent-strong)]"
            />
            <CalendarClock className="h-4 w-4 text-fg-soft" strokeWidth={2} />
            Für später planen
          </label>
          {scheduled && (
            <div className="mt-3 flex flex-col gap-1">
              <input
                type="datetime-local"
                value={publishLocal}
                min={minLocal}
                onChange={(e) => setPublishLocal(e.target.value)}
                aria-label="Veröffentlichungszeitpunkt"
                className="rounded-md border border-line bg-app px-3 py-2 text-base text-fg outline-none focus:border-accent"
              />
              {scheduleInvalid && <p className="text-xs text-muted">Wähle einen Zeitpunkt in der Zukunft.</p>}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending || uploading || !canSubmit}
          className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichere..." : scheduled ? "Planen" : "Veröffentlichen"}
        </button>
      </form>
    </div>
  );
}
