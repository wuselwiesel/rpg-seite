"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EMOJI_NAME } from "@/lib/custom-emoji";
import { isAnimatedImage } from "@/lib/image-animation";
import { createCustomEmoji, deleteCustomEmoji } from "./actions";

const MAX_BYTES = 256 * 1024;
const MAX_BYTES_ANIMATED = 1024 * 1024;
const ALLOWED = ["image/png", "image/gif", "image/webp"];
const TARGET_SIZE = 128;

type EmojiRow = { id: string; name: string; image_url: string; created_by: string };

// Verkleinert Standbilder auf max. 128 px und behält Transparenz (PNG).
// Animierte Bilder (GIF, animiertes WebP, APNG) bleiben unverändert, sonst gingen sie als Standbild verloren.
async function prepareImage(file: File): Promise<{ file: File; animated: boolean }> {
  const animated = isAnimatedImage(new Uint8Array(await file.arrayBuffer()));
  if (animated || file.type === "image/gif") return { file, animated };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TARGET_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return { file, animated: false };
  return { file: new File([blob], "emoji.png", { type: "image/png" }), animated: false };
}

// Aus einem Dateinamen wie "Süße Katze 2.png" einen gültigen Emoji-Namen vorschlagen.
function suggestName(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  const slug = base.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
  return EMOJI_NAME.test(slug) && !/^(image|bild|screenshot|unbenannt)/.test(slug) ? slug : "";
}

export function EmojiManager({
  worldName,
  emojis,
  currentUserId,
  isWorldOwner,
}: {
  worldName: string;
  emojis: EmojiRow[];
  currentUserId: string;
  isWorldOwner: boolean;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseFile(f: File | null) {
    setError(null);
    if (f && !ALLOWED.includes(f.type)) {
      setError("Erlaubt sind PNG, GIF und WebP.");
      return;
    }
    setFile(f);
    if (f && !name.trim()) setName(suggestName(f.name));
  }

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Strg+V / Cmd+V: Bild direkt aus der Zwischenablage einfügen (z. B. Screenshot oder kopiertes Bild).
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (!f) return;
      e.preventDefault();
      chooseFile(f);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Für Geräte ohne Tastenkürzel (Handy): Zwischenablage per Knopf lesen.
  async function pasteFromClipboard() {
    setError(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          chooseFile(new File([blob], `einfuegen.${type.split("/")[1]}`, { type }));
          return;
        }
      }
      setError("In der Zwischenablage liegt kein Bild.");
    } catch {
      setError("Zugriff auf die Zwischenablage nicht möglich. Probier Strg+V (Cmd+V) oder wähle eine Datei.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = name.trim().toLowerCase().replace(/^:|:$/g, "");
    if (!EMOJI_NAME.test(clean)) return setError("Name: 2–32 Zeichen, nur Kleinbuchstaben, Zahlen und Unterstrich.");
    if (!file) return setError("Bitte ein Bild auswählen.");
    if (!ALLOWED.includes(file.type)) return setError("Erlaubt sind PNG, GIF und WebP.");
    setBusy(true);
    try {
      const { file: prepared, animated } = await prepareImage(file);
      const limit = animated ? MAX_BYTES_ANIMATED : MAX_BYTES;
      if (prepared.size > limit) {
        setError(`Das Bild ist zu groß (max. ${limit / 1024} KB${animated ? " für animierte Emojis" : ""}).`);
        return;
      }
      const supabase = createClient();
      const ext = prepared.type === "image/gif" ? "gif" : prepared.type === "image/webp" ? "webp" : "png";
      const path = `emoji/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, prepared, { contentType: prepared.type });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const err = await createCustomEmoji(clean, url);
      if (err) {
        setError(err);
        return;
      }
      setName("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      window.location.reload();
    } catch {
      setError("Das Bild konnte nicht verarbeitet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Dieses Emoji wirklich löschen?")) return;
    const err = await deleteCustomEmoji(id);
    if (err) setError(err);
    else window.location.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <p className="text-sm font-medium text-fg">Neues Emoji für „{worldName}“</p>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Name
          <div className="flex items-center rounded-md border border-line bg-surface focus-within:border-accent">
            <span className="pl-3 text-muted">:</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={34}
              placeholder="katze"
              autoCapitalize="none"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-fg outline-none"
            />
            <span className="pr-3 text-muted">:</span>
          </div>
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            chooseFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm transition ${
            dragOver ? "border-accent bg-accent/10" : "border-line"
          }`}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vorschau" className="h-16 w-16 object-contain" />
              <span className="text-xs text-muted">{file?.name}</span>
            </>
          ) : (
            <span className="text-fg-soft">
              Bild hier ablegen, mit <kbd className="rounded bg-surface-2 px-1">Strg</kbd>+<kbd className="rounded bg-surface-2 px-1">V</kbd> einfügen oder Datei wählen
            </span>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-surface-2 px-3 py-1 text-xs text-fg hover:bg-surface-3"
            >
              Datei wählen
            </button>
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="rounded-full bg-surface-2 px-3 py-1 text-xs text-fg hover:bg-surface-3"
            >
              Aus Zwischenablage
            </button>
            {file && (
              <button
                type="button"
                onClick={() => {
                  chooseFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="rounded-full px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Entfernen
              </button>
            )}
          </div>
          <p className="text-xs text-muted">PNG, GIF oder WebP, auch animiert. Standbilder bis 256 KB, animierte bis 1 MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/gif,image/webp"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 self-start rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" strokeWidth={2} />
          {busy ? "Lädt hoch..." : "Hinzufügen"}
        </button>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">Emojis dieser Welt ({emojis.length})</p>
        {emojis.length === 0 ? (
          <p className="text-sm text-muted">Noch keine eigenen Emojis. Schreib später :name: in Beiträge, Kommentare und Chats.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {emojis.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image_url} alt={`:${e.name}:`} className="h-8 w-8 shrink-0 object-contain" />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">:{e.name}:</span>
                {(e.created_by === currentUserId || isWorldOwner) && (
                  <button
                    type="button"
                    onClick={() => remove(e.id)}
                    aria-label={`:${e.name}: löschen`}
                    className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
