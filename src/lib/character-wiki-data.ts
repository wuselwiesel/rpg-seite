import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/character-links";

export type PersonCard = { id: string; name: string; avatarUrl: string | null; wikiId: string | null; note?: string; color?: string };
export type SceneItem = { id: string; title: string; at: string; count: number; dateLabel: string | null };
export type TimelineItem = { key: number; kind: "scene" | "wiki"; title: string; href: string; label: string };

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function eventLabel(year: number | null, month: number | null, day: number | null): string | null {
  if (year == null) return null;
  return [day, month ? MONTHS[month - 1] : null, year].filter((x) => x != null).join(" ");
}
export const eventKey = (year: number, month: number | null, day: number | null) => year * 10000 + (month ?? 1) * 100 + (day ?? 1);

type RelRow = {
  character_a_id: string;
  character_b_id: string;
  type: string;
  type_b: string | null;
  color: string;
  label: string | null;
  ended_on: string | null;
  ended_label: string | null;
  a: { id: string; name: string; avatar_url: string | null } | null;
  b: { id: string; name: string; avatar_url: string | null } | null;
};

// Wiki-Seiten (Figuren) zu einer Liste von Figuren, für Links von Karten
async function wikiIdsFor(characterIds: string[]): Promise<Map<string, string>> {
  if (characterIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("wiki_pages").select("id, character_id").in("character_id", characterIds).returns<{ id: string; character_id: string }[]>();
  return new Map((data ?? []).map((r) => [r.character_id, r.id]));
}

// Beziehungen aus dem Beziehungsnetz als Karten (Geheimes liefert die Datenbank nur der Ersteller:in)
export async function getRelationCards(characterId: string): Promise<PersonCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("character_relationships")
    .select("character_a_id, character_b_id, type, type_b, color, label, ended_on, ended_label, a:character_a_id(id, name, avatar_url), b:character_b_id(id, name, avatar_url)")
    .or(`character_a_id.eq.${characterId},character_b_id.eq.${characterId}`)
    .limit(60)
    .returns<RelRow[]>();
  const rows = data ?? [];
  const wiki = await wikiIdsFor(rows.map((r) => (r.character_a_id === characterId ? r.character_b_id : r.character_a_id)));
  const cards: PersonCard[] = [];
  for (const r of rows) {
    const asA = r.character_a_id === characterId;
    const other = asA ? r.b : r.a;
    if (!other) continue;
    const kind = (asA ? r.type : r.type_b || r.type) + (r.label ? ` · ${r.label}` : "");
    const ended = r.ended_on || r.ended_label ? `Ehemals: ${kind}` : kind;
    cards.push({ id: other.id, name: other.name, avatarUrl: other.avatar_url, wikiId: wiki.get(other.id) ?? null, note: ended, color: r.color });
  }
  return cards;
}

// Mitglieder eines Hauses: Figuren, deren „Haus / Zugehörigkeit“ so heißt wie die Seite
export async function getHouseMembers(worldId: string, house: string): Promise<PersonCard[]> {
  const name = house.trim();
  if (!name) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("id, name, avatar_url")
    .eq("world_id", worldId)
    .is("deleted_at", null)
    .ilike("house", escapeLike(name))
    .order("name")
    .limit(60)
    .returns<{ id: string; name: string; avatar_url: string | null }[]>();
  const rows = data ?? [];
  const wiki = await wikiIdsFor(rows.map((r) => r.id));
  return rows.map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatar_url, wikiId: wiki.get(r.id) ?? null }));
}

export async function getCharacterGalleryUrls(characterId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("character_gallery")
    .select("image_url")
    .eq("character_id", characterId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{ image_url: string }[]>();
  return (data ?? []).map((r) => r.image_url);
}

type EntryRow = {
  story_post_id: string;
  created_at: string;
  story_posts: { id: string; title: string; created_at: string; event_year: number | null; event_month: number | null; event_day: number | null; is_spoiler: boolean | null } | null;
};

// Szenen einer Figur: die letzten, wer oft mit ihr schreibt, und der Zeitstrahl (Szenen und Wiki-Ereignisse mit Spielzeit)
export async function getCharacterStory(character: { id: string; world_id: string }, isOwn: boolean): Promise<{ recent: SceneItem[]; knows: PersonCard[]; timeline: TimelineItem[]; total: number }> {
  const supabase = await createClient();
  const [{ data: entries }, { data: eventPages }, { data: mentionPages }] = await Promise.all([
    supabase
      .from("story_entries")
      .select("story_post_id, created_at, story_posts!inner(id, title, created_at, event_year, event_month, event_day, is_spoiler)")
      .eq("character_id", character.id)
      .order("created_at", { ascending: false })
      .limit(1500)
      .returns<EntryRow[]>(),
    supabase
      .from("wiki_pages")
      .select("id, title, event_year, event_month, event_day")
      .eq("world_id", character.world_id)
      .eq("character_id", character.id)
      .not("event_year", "is", null)
      .returns<{ id: string; title: string; event_year: number; event_month: number | null; event_day: number | null }[]>(),
    supabase
      .from("wiki_pages")
      .select("id, title, event_year, event_month, event_day")
      .eq("world_id", character.world_id)
      .not("event_year", "is", null)
      .ilike("content", `%data-id="${character.id}"%`)
      .limit(40)
      .returns<{ id: string; title: string; event_year: number; event_month: number | null; event_day: number | null }[]>(),
  ]);

  const byScene = new Map<string, SceneItem & { post: NonNullable<EntryRow["story_posts"]> }>();
  for (const row of entries ?? []) {
    const post = row.story_posts;
    if (!post || (post.is_spoiler && !isOwn)) continue;
    const cur = byScene.get(post.id);
    if (cur) cur.count += 1;
    else byScene.set(post.id, { id: post.id, title: post.title, at: row.created_at, count: 1, dateLabel: eventLabel(post.event_year, post.event_month, post.event_day), post });
  }
  const scenes = Array.from(byScene.values()).sort((a, b) => b.at.localeCompare(a.at));
  const recent: SceneItem[] = scenes.slice(0, 8).map((s) => ({ id: s.id, title: s.title, at: s.at, count: s.count, dateLabel: s.dateLabel }));

  // Wer kennt wen: in wie vielen der (letzten 300) Szenen schreiben andere Figuren mit
  const sceneIds = scenes.slice(0, 300).map((s) => s.id);
  let knows: PersonCard[] = [];
  if (sceneIds.length > 0) {
    const { data: others } = await supabase
      .from("story_entries")
      .select("story_post_id, character_id")
      .in("story_post_id", sceneIds)
      .neq("character_id", character.id)
      .not("character_id", "is", null)
      .limit(20000)
      .returns<{ story_post_id: string; character_id: string }[]>();
    const seen = new Map<string, Set<string>>();
    for (const o of others ?? []) {
      const set = seen.get(o.character_id) ?? new Set<string>();
      set.add(o.story_post_id);
      seen.set(o.character_id, set);
    }
    const top = [...seen.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 6);
    if (top.length > 0) {
      const ids = top.map(([id]) => id);
      const [{ data: people }, wiki] = await Promise.all([
        supabase.from("characters").select("id, name, avatar_url").in("id", ids).returns<{ id: string; name: string; avatar_url: string | null }[]>(),
        wikiIdsFor(ids),
      ]);
      const byId = new Map((people ?? []).map((p) => [p.id, p]));
      knows = top.flatMap(([id, set]) => {
        const p = byId.get(id);
        return p ? [{ id, name: p.name, avatarUrl: p.avatar_url, wikiId: wiki.get(id) ?? null, note: `${set.size} gemeinsame ${set.size === 1 ? "Szene" : "Szenen"}` }] : [];
      });
    }
  }

  const timeline: TimelineItem[] = [];
  for (const s of byScene.values()) {
    const p = s.post;
    if (p.event_year != null) timeline.push({ key: eventKey(p.event_year, p.event_month, p.event_day), kind: "scene", title: p.title, href: `/story/${p.id}`, label: eventLabel(p.event_year, p.event_month, p.event_day) ?? "" });
  }
  const seenWiki = new Set<string>();
  for (const w of [...(eventPages ?? []), ...(mentionPages ?? [])]) {
    if (seenWiki.has(w.id)) continue;
    seenWiki.add(w.id);
    timeline.push({ key: eventKey(w.event_year, w.event_month, w.event_day), kind: "wiki", title: w.title, href: `/wiki/${w.id}`, label: eventLabel(w.event_year, w.event_month, w.event_day) ?? "" });
  }
  timeline.sort((a, b) => a.key - b.key);
  return { recent, knows, timeline, total: scenes.length };
}
