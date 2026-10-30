import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import { TrashList, type TrashItem } from "./trash-list";

export const metadata = { title: "Papierkorb" };

// Gelöschte Nachrichten und Beziehungen der letzten 30 Tage
export default async function TrashPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const since = cutoff.toISOString();
  // Ältere Einträge werden beim Öffnen entfernt
  await supabase.from("trash_items").delete().lt("deleted_at", since);

  const { data } = await supabase
    .from("trash_items")
    .select("id, kind, label, deleted_at, world_id")
    .order("deleted_at", { ascending: false })
    .limit(100)
    .returns<TrashItem[]>();

  return (
    <>
      <SettingsHeader title="Papierkorb" subtitle="Gelöschte Nachrichten und Beziehungen der letzten 30 Tage." />
      <TrashList items={data ?? []} />
    </>
  );
}
