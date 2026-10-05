"use client";

import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";

// Hintergrundbild einer Szene: verkleinert (max. 1920 px) in den öffentlichen Bucket „world-covers“.
export async function uploadSceneImage(source: File): Promise<{ url: string } | { error: string }> {
  const file = await resizeImage(source, 1920, 0.8);
  if (file.size > 5 * 1024 * 1024) return { error: "Bild ist zu groß (max. 5 MB)." };
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `scene-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("world-covers").upload(path, file, { contentType: file.type || undefined });
  if (error) return { error: error.message };
  return { url: supabase.storage.from("world-covers").getPublicUrl(path).data.publicUrl };
}
