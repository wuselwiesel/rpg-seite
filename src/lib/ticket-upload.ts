import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { UPLOAD_CACHE } from "@/lib/upload-cache";

export const MAX_TICKET_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;

// Lädt Screenshots in den privaten Speicher „ticket-files“ (Ordner = eigene Konto-Id) und gibt die Pfade zurück
export async function uploadTicketImages(files: File[]): Promise<{ paths: string[] } | { error: string }> {
  if (files.length === 0) return { paths: [] };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const paths: string[] = [];
  for (const original of files.slice(0, MAX_TICKET_IMAGES)) {
    if (!original.type.startsWith("image/")) return { error: "Nur Bilder sind erlaubt." };
    const file = await resizeImage(original);
    if (file.size > MAX_BYTES) return { error: "Ein Bild ist zu groß (max. 5 MB)." };
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("ticket-files").upload(path, file, { ...UPLOAD_CACHE, contentType: file.type });
    if (error) return { error: error.message };
    paths.push(path);
  }
  return { paths };
}

// Signierte Links für die Anzeige (eine Stunde gültig)
export async function signTicketImages(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase.storage.from("ticket-files").createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}
