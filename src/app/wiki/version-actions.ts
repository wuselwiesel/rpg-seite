"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Frühere Fassung einer Wiki-Seite wiederherstellen. Der jetzige Stand wird dabei selbst als Fassung gesichert (Datenbank-Auslöser),
// nichts geht verloren. Es gelten die normalen Bearbeitungsrechte an der Seite.
export async function restoreWikiVersion(pageId: string, versionId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: v } = await supabase
    .from("wiki_page_versions")
    .select("title, lead, content, fields, aliases, tags, cover_image_url, icon_url, gallery, page_type")
    .eq("id", versionId)
    .eq("page_id", pageId)
    .maybeSingle();
  if (!v) return "Die Fassung wurde nicht gefunden.";

  const { data, error } = await supabase.from("wiki_pages").update({ ...v, updated_at: new Date().toISOString() }).eq("id", pageId).select("id");
  if (error) return error.message;
  if (!data?.length) return "Du darfst diese Seite nicht bearbeiten.";

  revalidatePath("/wiki", "layout");
  return null;
}
