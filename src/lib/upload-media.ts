import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

// Lädt ein Foto/Video in den öffentlichen Bucket "post-media" und gibt die URL zurück.
export async function uploadPostMedia(input: File): Promise<{ url: string } | { error: string }> {
  const file = await resizeImage(input);
  if (file.size > MAX_MEDIA_BYTES) return { error: "Datei ist zu groß (max. 50 MB)." };
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
  if (error) return { error: error.message };
  return { url: supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl };
}
