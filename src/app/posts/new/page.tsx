"use client";

import { useActionState, useState } from "react";
import { Film, ImageIcon, Type, X } from "lucide-react";
import { createPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDraft } from "@/lib/use-draft";
import { uploadPostMedia } from "@/lib/upload-media";

type Kind = "text" | "image" | "video";

const KINDS: { id: Kind; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Foto", icon: ImageIcon },
  { id: "video", label: "Video", icon: Film },
];

export default function NewPostPage() {
  const [error, formAction, pending] = useActionState(createPost, null);
  const { draft, restored, update, clear } = useDraft("draft:post-new", { content: "" });
  const [kind, setKind] = useState<Kind>("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  function switchKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setMediaUrl("");
    setUploadError(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const result = await uploadPostMedia(file);
    if ("error" in result) setUploadError(result.error);
    else setMediaUrl(result.url);
    setUploading(false);
  }

  const canSubmit = kind === "text" ? true : Boolean(mediaUrl);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
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
      <form action={formAction} onSubmit={() => clear()} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="media_url" value={mediaUrl} />

        {kind === "text" ? (
          <div className="flex flex-col gap-1 text-sm text-fg-soft">
            Inhalt
            {restored && (
              <RichTextEditor
                key="restored"
                name="content"
                initialContent={draft.content}
                onChange={(html) => update({ content: html })}
              />
            )}
          </div>
        ) : (
          <>
            {mediaUrl ? (
              <div className="relative overflow-hidden rounded-xl bg-black">
                {kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl} alt="Vorschau" className="max-h-[60dvh] w-full object-contain" />
                ) : (
                  <video src={mediaUrl} controls playsInline className="max-h-[60dvh] w-full" />
                )}
                <button
                  type="button"
                  onClick={() => setMediaUrl("")}
                  aria-label="Entfernen"
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-14 text-center text-fg-soft transition hover:bg-surface-2">
                {kind === "image" ? <ImageIcon className="h-8 w-8" strokeWidth={1.5} /> : <Film className="h-8 w-8" strokeWidth={1.5} />}
                <span className="text-sm font-medium">
                  {uploading ? "Lädt hoch..." : kind === "image" ? "Foto auswählen" : "Video auswählen"}
                </span>
                {kind === "video" && <span className="text-xs text-muted">bis 50 MB</span>}
                <input
                  type="file"
                  accept={kind === "image" ? "image/*" : "video/*"}
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            )}
            {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              Bildunterschrift (optional)
              <textarea
                name="content"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={2000}
                className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending || uploading || !canSubmit}
          className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Veröffentliche..." : "Veröffentlichen"}
        </button>
      </form>
    </div>
  );
}
