import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { loadWorldRoster } from "@/lib/world-roster-data";
import { StorySections } from "@/components/story-sections";
import { WorldRoster } from "./world-roster";

export const metadata = { title: "Charaktere der Welt" };

// Alle Charaktere der Welt auf einen Blick: wer spielt wen, was ist frei, was ist ein NPC
export default async function WorldCharactersPage({ searchParams }: PageProps<"/story/charaktere">) {
  const sp = await searchParams;
  const stand = Array.isArray(sp.stand) ? sp.stand[0] : sp.stand;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const { characters, members, offerTargets, isAdmin } = await loadWorldRoster(supabase, world.id, user.id);

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-baseline gap-2">
        <h1 className="font-serif text-3xl text-fg">Story</h1>
        <p className="truncate text-sm text-muted">{world.name}</p>
      </div>
      <StorySections current="charaktere" />
      <WorldRoster initialFilter={stand === "free" ? "free" : "all"} characters={characters} members={members} offerTargets={offerTargets} isAdmin={isAdmin} />
    </div>
  );
}
