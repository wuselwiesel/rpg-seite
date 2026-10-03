import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { WikiMap, WikiMapPin } from "@/lib/wiki-map";

const PIN_COLUMNS = "id, map_id, x, y, label, icon, page_id, target_map_id";

export const getWikiMaps = cache(async (worldId: string): Promise<WikiMap[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("wiki_maps").select("*").eq("world_id", worldId).order("title").returns<WikiMap[]>();
  return data ?? [];
});

export async function getWikiMap(id: string): Promise<{ map: WikiMap; pins: WikiMapPin[] } | null> {
  const supabase = await createClient();
  const { data: map } = await supabase.from("wiki_maps").select("*").eq("id", id).maybeSingle<WikiMap>();
  if (!map) return null;
  const { data: pins } = await supabase.from("wiki_map_pins").select(PIN_COLUMNS).eq("map_id", id).returns<WikiMapPin[]>();
  // Postgres liefert numeric als Zahl oder Text; im Client immer als Zahl.
  return { map, pins: (pins ?? []).map((p) => ({ ...p, x: Number(p.x), y: Number(p.y) })) };
}

// Karten, auf denen eine Wiki-Seite markiert ist (für den Abschnitt „Auf der Karte“).
export async function getMapsForPage(pageId: string): Promise<{ pinId: string; mapId: string; mapTitle: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_map_pins")
    .select("id, label, map_id, wiki_maps(title)")
    .eq("page_id", pageId)
    .returns<{ id: string; label: string; map_id: string; wiki_maps: { title: string } | { title: string }[] | null }[]>();
  return (data ?? []).map((r) => {
    const m = Array.isArray(r.wiki_maps) ? r.wiki_maps[0] : r.wiki_maps;
    return { pinId: r.id, mapId: r.map_id, mapTitle: m?.title ?? "Karte", label: r.label };
  });
}
