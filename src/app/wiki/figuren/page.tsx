import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { loadFigureRows } from "@/lib/character-list-data";
import { FiguresTable } from "./figures-table";

export const metadata = { title: "Figuren" };

// Gesamtliste aller Figuren der Welt (Alter, Wesen, Haus), sortier-, filter- und druckbar
export default async function FiguresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");
  if (world.character_wiki_enabled !== true) notFound();

  const rows = await loadFigureRows(world.id);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-4xl text-fg">Figuren</h1>
      <FiguresTable rows={rows} worldName={world.name} />
    </div>
  );
}
