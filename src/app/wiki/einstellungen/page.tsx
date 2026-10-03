import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { WikiCrumbs } from "../wiki-crumbs";
import { TypesManager } from "./types-manager";

export default async function WikiSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [types, pages] = await Promise.all([getWikiTypes(world.id), getWikiPageRows(world.id)]);
  const rows = types.map((type) => ({
    type,
    count: pages.filter((p) => p.page_type === type.id).length,
    canDelete: type.createdBy === user.id || world.created_by === user.id,
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <WikiCrumbs crumbs={[]} />
        <h1 className="flex items-center gap-3 font-serif text-4xl text-fg @xl:text-5xl">
          <Settings className="h-8 w-8 text-accent" strokeWidth={1.5} />
          Wiki-Einstellungen
        </h1>
      </header>

      <section aria-labelledby="arten" className="flex flex-col gap-4">
        <div>
          <h2 id="arten" className="font-serif text-2xl text-fg">
            Seitenarten
          </h2>
          <p className="mt-1 text-sm text-fg-soft">
            Die Art einer Seite (Ort, Spezies, …) bereitet Steckbrief und Gliederung vor und färbt sie im Graph. Alle Mitglieder dürfen Arten anlegen und
            ändern. Löschen können die Person, die eine Art angelegt hat, und die Besitzer:in der Welt.
          </p>
        </div>
        <TypesManager rows={rows} />
      </section>
    </div>
  );
}
