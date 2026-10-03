"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { CharacterAvatar } from "./character-avatar";
import { ASPECTS, ImageCropper, canCrop } from "./image-cropper";
import { WorldCover } from "./world-cover";

const MAX_SIZE = 5 * 1024 * 1024;

export function AvatarUpload({
  name,
  initialUrl,
  displayName,
  bucket = "avatars",
  variant = "circle",
}: {
  name: string;
  initialUrl?: string | null;
  displayName: string;
  bucket?: string;
  // circle: rundes Profilbild; cover: breites Titelbild; standard: normales Querformat 4:3 (Wiki); portrait: normales Hochformat-Bild (z. B. Person im Wiki)
  variant?: "circle" | "cover" | "portrait" | "standard";
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    e.target.value = "";
    if (!original) return;
    if (canCrop(original)) setCropFile(original);
    else void upload(original);
  }

  async function upload(original: File) {
    const file = await resizeImage(original, 1200);

    if (file.size > MAX_SIZE) {
      setError("Bild ist zu groß (max. 5 MB).");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

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
    setUploading(false);
  }

  return (
    <div className={variant === "cover" ? "flex flex-col gap-3" : "flex items-center gap-4"}>
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspects={variant === "cover" ? [ASPECTS.cover, ASPECTS.landscape] : variant === "portrait" ? [ASPECTS.portrait, ASPECTS.square] : variant === "standard" ? [ASPECTS.standard, ASPECTS.square, ASPECTS.portrait] : [ASPECTS.square]}
          round={variant === "circle"}
          title={variant === "cover" ? "Titelbild zuschneiden" : variant === "portrait" || variant === "standard" ? "Bild zuschneiden" : "Profilbild zuschneiden"}
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
          {uploading ? "Lädt hoch..." : url ? "Bild ändern" : "Bild hochladen"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
