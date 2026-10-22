"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Geheimnis aufdecken: das Feld wird öffentlich (steht dann im Steckbrief der Seite) und verschwindet aus den geheimen Feldern.
// Nur die Besitzer:in der Figur (Datenbank-Regeln); die Seite muss sich außerdem bearbeiten lassen.
export async function revealSecretItem(itemId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: item } = await supabase
    .from("wiki_page_secret_items")
    .select("id, page_id, icon, title, text")
    .eq("id", itemId)
    .maybeSingle<{ id: string; page_id: string; icon: string; title: string; text: string }>();
  if (!item) return "Das Feld wurde nicht gefunden.";

  const { data: page } = await supabase.from("wiki_pages").select("fields").eq("id", item.page_id).maybeSingle<{ fields: { icon: string; title: string; text: string }[] | null }>();
  if (!page) return "Die Seite wurde nicht gefunden.";
  const fields = page.fields ?? [];
  if (fields.length >= 20) return "Der Steckbrief ist voll (höchstens 20 Felder).";

  const next = [...fields.filter((f) => f.title.trim().toLowerCase() !== item.title.trim().toLowerCase()), { icon: item.icon, title: item.title, text: item.text }];
  const { data: updated, error } = await supabase.from("wiki_pages").update({ fields: next, updated_at: new Date().toISOString() }).eq("id", item.page_id).select("id");
  if (error) return error.message;
  if (!updated?.length) return "Du darfst diese Seite nicht bearbeiten, das Feld bleibt geheim.";

  const { error: delError } = await supabase.from("wiki_page_secret_items").delete().eq("id", itemId);
  if (delError) return delError.message;

  revalidatePath(`/wiki/${item.page_id}`);
  revalidatePath(`/wiki/${item.page_id}/edit`);
  return null;
}
