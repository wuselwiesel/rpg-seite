"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CharacterAvatar } from "./character-avatar";

const MAX_SIZE = 5 * 1024 * 1024;

export function AvatarUpload({
  name,
  initialUrl,
  displayName,
}: {
  name: string;
  initialUrl?: string | null;
  displayName: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
      .from("avatars")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={url} />
      <CharacterAvatar name={displayName} avatarUrl={url} size={56} />
      <div className="flex flex-col gap-1">
        <label className="cursor-pointer text-sm text-amber-500 hover:underline">
          {uploading ? "Lädt hoch..." : url ? "Bild ändern" : "Bild hochladen"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
