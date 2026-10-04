import type { createClient } from "@/lib/supabase/server";

export type DatedChapter = {
  id: string;
  sceneId: string;
  sceneTitle: string;
  // Laufende Nummer in der Szene (wie der Anker #kapitel-N)
  number: number;
  title: string;
  summary: string | null;
  event_year: number;
  event_month: number | null;
  event_day: number | null;
};

type Row = {
  id: string;
  story_post_id: string;
  chapter_title: string | null;
  content: string;
  chapter_summary: string | null;
  created_at: string;
  event_year: number | null;
  event_month: number | null;
  event_day: number | null;
  story_posts: { title: string; archived: boolean; world_id: string } | null;
};

// Kapitel-Marken mit Datum im Kalender der Welt (für Zeitleiste und Kalender). Gesehen wird nur, was die Datenbank für diese Person freigibt.
export async function getDatedChapters(supabase: Awaited<ReturnType<typeof createClient>>, worldId: string): Promise<DatedChapter[]> {
  const { data } = await supabase
    .from("story_entries")
    .select("id, story_post_id, chapter_title, content, chapter_summary, created_at, event_year, event_month, event_day, story_posts!inner(title, archived, world_id)")
    .eq("kind", "chapter")
    .eq("story_posts.world_id", worldId)
    .order("created_at", { ascending: true })
    .returns<Row[]>();
  const counter = new Map<string, number>();
  const out: DatedChapter[] = [];
  for (const r of data ?? []) {
    const n = (counter.get(r.story_post_id) ?? 0) + 1;
    counter.set(r.story_post_id, n);
    if (r.event_year == null || !r.story_posts || r.story_posts.archived) continue;
    out.push({
      id: r.id,
      sceneId: r.story_post_id,
      sceneTitle: r.story_posts.title,
      number: n,
      title: r.chapter_title ?? r.content,
      summary: r.chapter_summary,
      event_year: r.event_year,
      event_month: r.event_month,
      event_day: r.event_day,
    });
  }
  return out;
}
