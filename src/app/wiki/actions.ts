"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { parseProfileFields } from "@/lib/profile-fields";
import { pageSubtreeIds } from "@/lib/wiki-tree";
import { parseWikiType } from "@/lib/wiki-types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_GALLERY = 24;

function parseAliases(raw: FormDataEntryValue | null): string[] {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split(",")
        .map((a) => a.trim().slice(0, 60))
        .filter((a) => a.length >= 2),
    ),
  ).slice(0, 12);
}

// Nur http(s)-Adressen aus dem eigenen Speicher; Reihenfolge bleibt erhalten.
function parseGallery(formData: FormData): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of formData.getAll("gallery")) {
    const url = String(raw).trim();
    if (!/^https?:\/\//.test(url) || url.length > 500 || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out.slice(0, MAX_GALLERY);
}

type PageInput = {
  title: string;
  lead: string | null;
  content: string;
  aliases: string[];
  cover_image_url: string | null;
  gallery: string[];
  fields: { icon: string; title: string; text: string }[];
  folder_id: string | null;
  parent_page_id: string | null;
  page_type: string | null;
};

// Liest und prüft das Formular. Eine Oberseite bestimmt den Ordner (Unterseiten liegen im Ordner ihrer Oberseite).
async function readPageForm(
  supabase: Supabase,
  worldId: string,
  formData: FormData,
): Promise<{ error: string } | { input: PageInput }> {
  const title = String(formData.get("title") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!title) return { error: "Titel darf nicht leer sein." };

  let folderId = String(formData.get("folder_id") ?? "") || null;
  const parentId = String(formData.get("parent_page_id") ?? "") || null;

  if (parentId) {
    const { data: parent } = await supabase
      .from("wiki_pages")
      .select("id, folder_id")
      .eq("id", parentId)
      .eq("world_id", worldId)
      .maybeSingle();
    if (!parent) return { error: "Die gewählte Oberseite gibt es nicht." };
    folderId = parent.folder_id ?? null;
  } else if (folderId) {
    const { data: folder } = await supabase
      .from("wiki_folders")
      .select("id")
      .eq("id", folderId)
      .eq("world_id", worldId)
      .maybeSingle();
    if (!folder) return { error: "Der gewählte Ordner existiert nicht mehr." };
  }

  return {
    input: {
      title,
      lead: String(formData.get("lead") ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null,
      content: sanitizePostHtml(String(formData.get("content") ?? "").trim()),
      aliases: parseAliases(formData.get("aliases")),
      cover_image_url: String(formData.get("cover_image_url") ?? "").trim() || null,
      gallery: parseGallery(formData),
      fields: parseProfileFields(formData),
      folder_id: folderId,
      parent_page_id: parentId,
      page_type: parseWikiType(formData.get("page_type")),
    },
  };
}

export async function createWikiPage(_prevState: string | null, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const world = await getActiveWorld(user.id);
  if (!world) return "Keine aktive Welt.";

  const parsed = await readPageForm(supabase, world.id, formData);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("wiki_pages")
    .insert({ ...parsed.input, world_id: world.id, category: "sonstiges", created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return error?.message ?? "Seite konnte nicht erstellt werden.";

  revalidatePath("/wiki", "layout");
  redirect(`/wiki/${data.id}`);
}

export async function updateWikiPage(wikiPageId: string, _prevState: string | null, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: existing } = await supabase.from("wiki_pages").select("world_id").eq("id", wikiPageId).maybeSingle();
  if (!existing) return "Der Eintrag konnte nicht gefunden werden.";

  const parsed = await readPageForm(supabase, existing.world_id, formData);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("wiki_pages")
    .update({ ...parsed.input, updated_at: new Date().toISOString() })
    .eq("id", wikiPageId)
    .select("id");

  if (error) return error.message;
  // RLS lehnt unberechtigte Änderungen ohne Fehler ab (0 Zeilen) – das soll nicht wie Erfolg aussehen.
  if (!data?.length) return "Der Eintrag konnte nicht gespeichert werden (keine Berechtigung oder gelöscht).";

  // Unterseiten (auch tiefere Ebenen) ziehen mit in den neuen Ordner.
  const { data: rows } = await supabase
    .from("wiki_pages")
    .select("id, parent_page_id")
    .eq("world_id", existing.world_id);
  const subtree = pageSubtreeIds(
    (rows ?? []).map((r) => ({ id: r.id, title: "", folder_id: null, parent_page_id: r.parent_page_id })),
    wikiPageId,
  );
  subtree.delete(wikiPageId);
  if (subtree.size) await supabase.from("wiki_pages").update({ folder_id: parsed.input.folder_id }).in("id", [...subtree]);

  revalidatePath("/wiki", "layout");
  redirect(`/wiki/${wikiPageId}`);
}

// Unterseiten rücken per Datenbank-Trigger eine Ebene hoch.
export async function deleteWikiPage(wikiPageId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase.from("wiki_pages").delete({ count: "exact" }).eq("id", wikiPageId);

  if (error) return error.message;
  if (!count) return "Seite konnte nicht gelöscht werden.";

  revalidatePath("/wiki", "layout");
  return null;
}

// Seite per Ziehen verschieben: in einen Ordner (folderId), unter eine andere Seite (parentPageId, dann gilt deren Ordner)
// oder auf die oberste Ebene (beides null). Unterseiten ziehen in den neuen Ordner mit. Der „zuletzt bearbeitet“-Zeitpunkt
// bleibt unverändert; Kreise und fremde Welten lehnt zusätzlich ein Datenbank-Trigger ab.
export async function moveWikiPage(
  wikiPageId: string,
  folderId: string | null,
  parentPageId: string | null,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: existing } = await supabase.from("wiki_pages").select("world_id").eq("id", wikiPageId).maybeSingle();
  if (!existing) return "Der Eintrag konnte nicht gefunden werden.";

  const { data: rows } = await supabase
    .from("wiki_pages")
    .select("id, parent_page_id")
    .eq("world_id", existing.world_id);
  const subtree = pageSubtreeIds(
    (rows ?? []).map((r) => ({ id: r.id, title: "", folder_id: null, parent_page_id: r.parent_page_id })),
    wikiPageId,
  );
  if (parentPageId && subtree.has(parentPageId)) return "Eine Seite kann nicht unter sich selbst oder ihre Unterseite.";

  const { data, error } = await supabase
    .from("wiki_pages")
    .update({ folder_id: folderId, parent_page_id: parentPageId })
    .eq("id", wikiPageId)
    .select("id");
  if (error) return error.message;
  if (!data?.length) return "Verschieben nicht möglich (keine Berechtigung).";

  subtree.delete(wikiPageId);
  if (subtree.size) await supabase.from("wiki_pages").update({ folder_id: folderId }).in("id", [...subtree]);

  revalidatePath("/wiki", "layout");
  return null;
}
