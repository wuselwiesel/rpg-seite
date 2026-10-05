"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";

export const MAX_CHAT_IMAGE_BYTES = 25 * 1024 * 1024;

export function chatImageError(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Nur Bilder können gesendet werden.";
  if (file.size > MAX_CHAT_IMAGE_BYTES) return "Bild ist zu groß (max. 25 MB).";
  return null;
}

// Verkleinert das Bild und legt es im Bucket „chat-media“ ab; liefert die öffentliche Adresse oder eine Fehlermeldung.
export async function uploadChatImage(folder: string, source: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();
  const file = await resizeImage(source);
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file);
  if (error) return { error: error.message };
  return { url: supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl };
}

// Das gewählte, noch nicht gesendete Bild eines Chat-Eingabefelds (mit Vorschau).
export function useImageDraft() {
  const [pending, setPending] = useState<{ file: File; previewUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = chatImageError(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const previewUrl = URL.createObjectURL(file);
    urlRef.current = previewUrl;
    setPending({ file, previewUrl });
  }

  // Beim Senden wird die Vorschau-Adresse weitergegeben und erst später freigegeben.
  function take() {
    const current = pending;
    urlRef.current = null;
    setPending(null);
    return current;
  }

  function clear() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPending(null);
  }

  function restore(image: { file: File; previewUrl: string }) {
    urlRef.current = image.previewUrl;
    setPending(image);
  }

  return { pending, error, setError, pick, take, clear, restore };
}
