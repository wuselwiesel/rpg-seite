import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiMap, getWikiMaps } from "@/lib/wiki-map-data";
import { getWikiPageRows } from "@/lib/wiki-data";
import { WikiCrumbs } from "../../wiki-crumbs";
import { MapViewer } from "./map-viewer";

export default async function WikiMapPage({ params, searchParams }: PageProps<"/wiki/karten/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const found = await getWikiMap(id);
  if (!found) notFound();
  const { map, pins } = found;
  const world = await getActiveWorld(user.id);
  const worldOwnerId =
    world?.id === map.world_id
      ? world.created_by
      : (await supabase.from("worlds").select("created_by").eq("id", map.world_id).maybeSingle()).data?.created_by;

  const [maps, pageRows] = await Promise.all([getWikiMaps(map.world_id), getWikiPageRows(map.world_id)]);
  const pinParam = Array.isArray(sp.pin) ? sp.pin[0] : sp.pin;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <WikiCrumbs crumbs={[{ href: "/wiki/karten", label: "Karten" }]} />
        <h1 className="font-serif text-4xl text-fg @xl:text-5xl">{map.title}</h1>
        {map.description && <p className="max-w-prose text-fg-soft">{map.description}</p>}
      </header>
      <MapViewer
        key={map.id}
        map={map}
        initialPins={pins}
        pages={pageRows.map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title, "de"))}
        otherMaps={maps.filter((m) => m.id !== map.id).map((m) => ({ id: m.id, title: m.title }))}
        canDelete={map.created_by === user.id || worldOwnerId === user.id}
        initialPinId={pins.some((p) => p.id === pinParam) ? pinParam : undefined}
      />
    </div>
  );
}
