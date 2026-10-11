import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { getWikiMaps } from "@/lib/wiki-map-data";
import { defaultHome, type WikiHome } from "@/lib/wiki-home";
import { HomeEditor, type TileOption } from "./home-editor";

export async function HomeEditorPage({ worldId, home }: { worldId: string; home: WikiHome | null }) {
  const [folders, pages, maps] = await Promise.all([getWikiFolders(worldId), getWikiPageRows(worldId), getWikiMaps(worldId)]);
  const options: TileOption[] = [
    ...pages.filter((p) => !p.is_draft).map((p) => ({ kind: "page" as const, id: p.id, title: p.title })),
    ...folders.map((f) => ({ kind: "folder" as const, id: f.id, title: f.name })),
    ...maps.map((m) => ({ kind: "map" as const, id: m.id, title: m.title })),
  ].sort((a, b) => a.title.localeCompare(b.title, "de"));
  return <HomeEditor worldId={worldId} initial={home ?? defaultHome()} hasHome={!!home} options={options} />;
}
