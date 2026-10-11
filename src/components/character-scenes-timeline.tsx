import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Row = {
  story_post_id: string;
  created_at: string;
  story_posts: {
    id: string;
    title: string;
    created_at: string;
    location: string | null;
    in_world_time: string | null;
    event_year: number | null;
    event_month: number | null;
    event_day: number | null;
    is_spoiler: boolean | null;
    short_summary: string | null;
  } | null;
};

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function eventLabel(p: NonNullable<Row["story_posts"]>): string | null {
  if (p.event_year == null) return null;
  const month = p.event_month ? MONTHS[p.event_month - 1] : null;
  return [p.event_day, month, p.event_year].filter((x) => x != null).join(" ");
}

// „Was hat dieser Charakter erlebt?“ – die Szenen, in denen er geschrieben hat, in Reihenfolge der Spielzeit (sonst des Anlegens).
export async function CharacterScenesTimeline({ characterId, isOwn }: { characterId: string; isOwn: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_entries")
    .select("story_post_id, created_at, story_posts!inner(id, title, created_at, location, in_world_time, event_year, event_month, event_day, is_spoiler, short_summary)")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true })
    .limit(1500)
    .returns<Row[]>();

  const byScene = new Map<string, { post: NonNullable<Row["story_posts"]>; count: number; first: string }>();
  for (const row of data ?? []) {
    const post = row.story_posts;
    if (!post) continue;
    if (post.is_spoiler && !isOwn) continue;
    const cur = byScene.get(post.id);
    if (cur) cur.count += 1;
    else byScene.set(post.id, { post, count: 1, first: row.created_at });
  }
  const scenes = Array.from(byScene.values());
  if (scenes.length === 0) return null;

  // Spielzeit (Jahr, Monat, Tag) vor Anlegedatum; Szenen ohne Spielzeit nach dem Anlegen einsortieren
  const key = (s: (typeof scenes)[number]) => {
    const p = s.post;
    if (p.event_year != null) return p.event_year * 10000 + (p.event_month ?? 1) * 100 + (p.event_day ?? 1);
    return null;
  };
  const dated = scenes.filter((s) => key(s) != null).sort((a, b) => (key(a) as number) - (key(b) as number));
  const undated = scenes.filter((s) => key(s) == null).sort((a, b) => a.first.localeCompare(b.first));
  const ordered = [...dated, ...undated];

  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
        <span>
          Erlebtes <span className="font-normal text-muted">({ordered.length} Szenen)</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" strokeWidth={2} />
      </summary>
      <ol className="relative mx-4 mb-4 flex flex-col gap-3 border-l-2 border-line pl-4">
        {ordered.map(({ post, count, first }) => {
          const when = eventLabel(post) ?? post.in_world_time ?? new Date(first).toLocaleDateString("de-DE");
          return (
            <li key={post.id} className="relative text-sm">
              <span className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
              <Link href={`/story/${post.id}`} className="font-medium text-fg transition hover:text-accent">
                {post.title}
              </Link>
              <p className="text-xs text-muted">
                {when}
                {post.location ? ` · ${post.location}` : ""} · {count} {count === 1 ? "Beitrag" : "Beiträge"}
              </p>
              {post.short_summary && <p className="mt-0.5 text-xs text-fg-soft">{post.short_summary}</p>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
