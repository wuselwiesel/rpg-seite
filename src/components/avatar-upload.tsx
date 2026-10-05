"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { CharacterAvatar } from "./character-avatar";
import { ASPECTS, ImageCropper, canCrop } from "./image-cropper";
import { WorldCover, isIconCover } from "./world-cover";

const MAX_SIZE = 5 * 1024 * 1024;

export function AvatarUpload({
  name,
  initialUrl,
  displayName,
  bucket = "avatars",
  variant = "circle",
  onChange,
}: {
  name: string;
  initialUrl?: string | null;
  displayName: string;
  bucket?: string;
  // icon: Symbol ohne Hintergrund (PNG/SVG/WebP/GIF), wird weder zugeschnitten noch verkleinert, damit die Transparenz bleibt;
  // circle: rundes Profilbild; cover: breites Titelbild; standard: normales Querformat 4:3 (Wiki); portrait: normales Hochformat-Bild (z. B. Person im Wiki)
  variant?: "circle" | "cover" | "world" | "portrait" | "standard" | "icon";
  // Meldet die neue Adresse (z. B. für Formulare, die nicht über das versteckte Feld laufen)
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    e.target.value = "";
    if (!original) return;
    if (variant === "icon") void upload(original);
    else if (canCrop(original)) setCropFile(original);
    else void upload(original);
  }

  // Icon: Bild aus der Zwischenablage (Strg/Cmd+V) oder per Ziehen ablegen.
  function takeImage(files: FileList | File[] | null | undefined): boolean {
    const file = Array.from(files ?? []).find((f) => f.type.startsWith("image/"));
    if (!file) return false;
    void upload(file);
    return true;
  }

  async function pasteFromClipboard() {
    setError(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          void upload(new File([blob], `eingefuegt.${type.split("/")[1].replace("svg+xml", "svg")}`, { type }));
          return;
        }
      }
      setError("In der Zwischenablage liegt kein Bild.");
    } catch {
      setError("Kein Zugriff auf die Zwischenablage. Klicke auf das Feld und drücke Strg/Cmd+V.");
    }
  }

  // asIcon: Welt-Bild ohne Hintergrund (PNG/SVG/WebP/GIF unverändert, Dateiname „icon-…“); sonst wie bisher
  async function upload(original: File, asIcon = false) {
    const keepAsIs = variant === "icon" || asIcon;
    const file = keepAsIs ? original : await resizeImage(original, 1200);
    const maxSize = keepAsIs ? 2 * 1024 * 1024 : MAX_SIZE;

    if (keepAsIs && !/^image\/(png|svg\+xml|webp|gif)$/.test(file.type)) {
      setError("Für Icons bitte PNG, SVG, WebP oder GIF nehmen (nur diese Formate können durchsichtig sein).");
      return;
    }
    if (file.size > maxSize) {
      setError(keepAsIs ? "Icon ist zu groß (max. 2 MB)." : "Bild ist zu groß (max. 5 MB).");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${asIcon ? "icon-" : ""}${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setUrl(data.publicUrl);
    onChange?.(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className={variant === "cover" || variant === "world" ? "flex flex-col gap-3" : "flex items-center gap-4"}>
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspects={variant === "cover" ? [ASPECTS.cover, ASPECTS.landscape] : variant === "world" ? [ASPECTS.square, ASPECTS.standard, ASPECTS.landscape, ASPECTS.cover] : variant === "portrait" ? [ASPECTS.portrait, ASPECTS.square] : variant === "standard" ? [ASPECTS.standard, ASPECTS.square, ASPECTS.portrait] : [ASPECTS.square]}
          round={variant === "circle"}
          title={variant === "cover" || variant === "world" ? "Titelbild zuschneiden" : variant === "portrait" || variant === "standard" ? "Bild zuschneiden" : "Profilbild zuschneiden"}
          onCancel={() => setCropFile(null)}
          onDone={(cropped) => {
            setCropFile(null);
            void upload(cropped);
          }}
        />
      )}
      <input type="hidden" name={name} value={url} />
      {variant === "cover" ? (
        <WorldCover name={displayName} coverUrl={url} className="h-32 w-full" />
      ) : variant === "world" ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={`h-auto max-h-40 w-auto max-w-full self-start rounded-xl ${isIconCover(url) ? "" : "bg-surface-2"}`} />
        ) : (
          <WorldCover name={displayName} coverUrl={null} className="h-32 w-32" />
        )
      ) : variant === "icon" ? (
        <span
          tabIndex={0}
          role="group"
          aria-label="Icon: hier Bild einfügen (Strg/Cmd+V) oder ablegen"
          title="Anklicken und Strg/Cmd+V drücken, oder ein Bild hierher ziehen"
          onPaste={(e) => {
            if (takeImage(e.clipboardData.files)) e.preventDefault();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            takeImage(e.dataTransfer.files);
          }}
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          style={{ backgroundImage: "conic-gradient(var(--surface-2) 25%, var(--surface) 0 50%, var(--surface-2) 0 75%, var(--surface) 0)", backgroundSize: "16px 16px" }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <span className="px-2 text-center text-xs text-muted">Hier einfügen oder ablegen</span>
          )}
        </span>
      ) : variant === "standard" ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="aspect-[4/3] h-28 rounded-xl bg-surface-2 object-cover" />
        ) : (
          <span aria-hidden className="flex aspect-[4/3] h-28 items-center justify-center rounded-xl bg-surface-2 text-3xl text-muted">
            {displayName.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )
      ) : variant === "portrait" ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-28 w-[5.6rem] rounded-xl bg-surface-2 object-cover" />
        ) : (
          <span aria-hidden className="flex h-28 w-[5.6rem] items-center justify-center rounded-xl bg-surface-2 text-3xl text-muted">
            {displayName.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )
      ) : (
        <CharacterAvatar name={displayName} avatarUrl={url} size={56} />
      )}
      <div className="flex flex-col gap-1">
        <label className="cursor-pointer text-sm text-accent hover:underline">
          {uploading ? "Lädt hoch..." : url ? (variant === "icon" ? "Icon ändern" : "Bild ändern") : variant === "icon" ? "Icon hochladen" : "Bild hochladen"}
          <input
            type="file"
            accept={variant === "icon" ? "image/png,image/svg+xml,image/webp,image/gif" : "image/*"}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {variant === "world" && (
          <label className="cursor-pointer text-sm text-accent hover:underline">
            Als Icon hochladen (ohne Hintergrund)
            <input
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f, true);
              }}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
        {variant === "icon" && (
          <button type="button" onClick={pasteFromClipboard} disabled={uploading} className="w-fit text-left text-sm text-accent hover:underline">
            Aus Zwischenablage einfügen
          </button>
        )}
        {variant === "icon" && url && (
          <button type="button" onClick={() => { setUrl(""); onChange?.(""); }} className="w-fit text-left text-sm text-muted hover:text-fg">
            Icon entfernen
          </button>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
