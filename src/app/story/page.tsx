import Link from "next/link";
import { LayoutList, MapPin, Rows3, SlidersHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { EntryCard } from "@/components/entry-card";
import { StoryCompactRow } from "@/components/story-compact-row";
import { CharacterAvatar } from "@/components/character-avatar";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { escapePostgrestValue } from "@/lib/postgrest";
import type { StoryArc, StoryPost } from "@/lib/types";

export default async function StoryPage({ searchParams }: PageProps<"/story">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const tag = typeof params.tag === "string" ? params.tag.trim().toLowerCase() : "";
  const arc = typeof params.arc === "string" ? params.arc.trim() : "";
  const ort = typeof params.ort === "string" ? params.ort.trim() : "";
  const onlyMyTurn = params.dran === "1";
  const showArchived = params.archived === "1";
  const bookmarkedOnly = params.bookmarked === "1";
  const compact = params.ansicht === "kompakt";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  let storyQuery = supabase
    .from("story_posts")
    .select("*, characters!story_posts_character_id_fkey(*), story_entries(count), story_arcs(name)")
    .eq("world_id", activeWorld.id)
    .eq("archived", showArchived)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (q) {
    const escaped = escapePostgrestValue(q);
    storyQuery = storyQuery.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }
  if (tag) storyQuery = storyQuery.contains("tags", [tag]);
  if (arc) storyQuery = storyQuery.eq("arc_id", arc);
  if (ort) storyQuery = storyQuery.eq("location", ort);
  if (from) storyQuery = storyQuery.gte("created_at", new Date(from).toISOString());
  if (to) {
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
    storyQuery = storyQuery.lt("created_at", toDate.toISOString());
  }
  if (bookmarkedOnly) {
    const { data: bookmarks } = await supabase
      .from("story_bookmarks")
      .select("story_post_id")
      .eq("user_id", user.id);
    const bookmarkedIds = (bookmarks ?? []).map((b) => b.story_post_id);
    storyQuery = storyQuery.in("id", bookmarkedIds.length > 0 ? bookmarkedIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: myChars } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", user.id)
    .eq("world_id", activeWorld.id);
  const myCharIds = (myChars ?? []).map((c) => c.id);
  if (onlyMyTurn) {
    storyQuery = storyQuery.in("turn_character_id", myCharIds.length ? myCharIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const [{ data: storyPosts }, { data: arcs }, { data: locationRows }, { count: myTurnCount }] = await Promise.all([
    storyQuery.returns<StoryPost[]>(),
    supabase
      .from("story_arcs")
      .select("*, story_posts(count)")
      .eq("world_id", activeWorld.id)
      .order("name")
      .returns<(StoryArc & { story_posts: { count: number }[] })[]>(),
    supabase
      .from("story_posts")
      .select("location")
      .eq("world_id", activeWorld.id)
      .eq("archived", false)
      .not("location", "is", null),
    supabase
      .from("story_posts")
      .select("id", { count: "exact", head: true })
      .eq("world_id", activeWorld.id)
      .eq("archived", false)
      .in("turn_character_id", myCharIds.length ? myCharIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const locations = Array.from(new Set((locationRows ?? []).map((r) => r.location as string))).sort();

  const filterCount = [arc, ort, onlyMyTurn, showArchived, bookmarkedOnly, q, tag, from || to].filter(Boolean).length;
  function viewHref(view: "karten" | "kompakt") {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "ansicht" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) next.append(key, v);
    }
    if (view === "kompakt") next.set("ansicht", "kompakt");
    const qs = next.toString();
    return qs ? `/story?${qs}` : "/story";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="font-serif text-3xl text-fg">Story</h1>
          <p className="truncate text-sm text-muted">{activeWorld.name}</p>
        </div>
        <div className="flex shrink-0 rounded-full border border-line bg-surface p-0.5" role="group" aria-label="Ansicht">
          <Link
            href={viewHref("karten")}
            replace
            aria-label="Karten"
            aria-current={!compact ? "true" : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${!compact ? "bg-accent-strong text-on-accent-strong" : "text-muted hover:text-fg"}`}
          >
            <Rows3 className="h-4 w-4" strokeWidth={2} />
          </Link>
          <Link
            href={viewHref("kompakt")}
            replace
            aria-label="Kompakte Liste"
            aria-current={compact ? "true" : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${compact ? "bg-accent-strong text-on-accent-strong" : "text-muted hover:text-fg"}`}
          >
            <LayoutList className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <details className="group mb-4" open={filterCount > 0}>
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
          Filter
          {filterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-medium text-on-accent-strong">
              {filterCount}
            </span>
          )}
        </summary>
        <div className="mt-3 flex flex-col gap-3">
      {arcs && arcs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/story"
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !arc ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
            }`}
          >
            Alle
          </Link>
          {arcs.map((a) => (
            <Link
              key={a.id}
              href={`/story?arc=${a.id}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                arc === a.id
                  ? "bg-accent-strong text-on-accent-strong"
                  : "bg-surface-2 text-fg-soft hover:text-fg"
              }`}
            >
              {a.name} ({a.story_posts?.[0]?.count ?? 0})
            </Link>
          ))}
        </div>
      )}

      {locations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 text-muted" strokeWidth={2} />
          <Link
            href="/story"
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !ort ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
            }`}
          >
            Alle Orte
          </Link>
          {locations.map((l) => (
            <Link
              key={l}
              href={`/story?ort=${encodeURIComponent(l)}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                ort === l ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
      )}

      {arc && (
        <p className="text-sm">
          <Link href={`/story/arc/${arc}/buch`} className="text-accent hover:underline">
            Diesen Handlungsstrang als Buch (PDF / E-Book)
          </Link>
        </p>
      )}

      <SearchFilterBar basePath="/story" q={q} from={from} to={to} tag={tag} label="Suche & Zeitraum" tight />

      <div className="flex flex-wrap gap-2">
        {(myTurnCount ?? 0) > 0 && (
          <Link
            href={onlyMyTurn ? "/story" : "/story?dran=1"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              onlyMyTurn ? "bg-accent-strong text-on-accent-strong" : "bg-accent-strong/15 text-accent hover:bg-accent-strong/25"
            }`}
          >
            Du bist dran ({myTurnCount})
          </Link>
        )}
        <Link
          href={bookmarkedOnly ? "/story" : "/story?bookmarked=1"}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            bookmarkedOnly ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
          }`}
        >
          Nur Lesezeichen
        </Link>
        <Link
          href={showArchived ? "/story" : "/story?archived=1"}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            showArchived ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
          }`}
        >
          {showArchived ? "Archiv" : "Archiv anzeigen"}
        </Link>
      </div>

        </div>
      </details>

      <Link
        href="/story/new"
        className="mb-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition hover:bg-surface-2 active:bg-surface-3"
      >
        <CharacterAvatar
          name={activeCharacter.name}
          avatarUrl={activeCharacter.avatar_url}
          size={36}
        />
        <span className="text-sm text-muted">
          Beginn eine neue Szene als {activeCharacter.name}...
        </span>
      </Link>

      <div className={compact ? "flex flex-col divide-y divide-line" : "flex flex-col gap-4"}>
        {storyPosts?.length ? (
          storyPosts.map((post, index) => compact ? (
            <StoryCompactRow
              key={post.id}
              href={`/story/${post.id}`}
              title={post.title}
              content={post.content}
              createdAt={post.created_at}
              character={post.characters}
              replyCount={post.story_entries?.[0]?.count ?? 0}
              location={post.location}
              pinned={post.pinned}
              yourTurn={!!post.turn_character_id && myCharIds.includes(post.turn_character_id)}
            />
          ) : (
            <EntryCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content}
              createdAt={post.created_at}
              character={post.characters}
              characterHref={`/characters/${post.character_id}`}
              detailHref={`/story/${post.id}`}
              replyCount={post.story_entries?.[0]?.count ?? 0}
              replyLabel="Fortsetzungen"
              replyCta="Weiterschreiben"
              index={index}
              tags={post.tags}
              tagHrefBase="/story"
              arcName={post.story_arcs?.name}
              arcHref={post.arc_id ? `/story?arc=${post.arc_id}` : undefined}
              isPrivate={post.is_private}
              pinned={post.pinned}
              location={post.location}
              inWorldTime={post.in_world_time}
              locationHrefBase="/story"
              yourTurn={!!post.turn_character_id && myCharIds.includes(post.turn_character_id)}
            />
          ))
        ) : q || tag || from || to || arc || ort || onlyMyTurn ? (
          <p className="text-muted">Keine Einträge gefunden.</p>
        ) : (
          <p className="text-muted">
            Noch keine Szene begonnen.{" "}
            <Link href="/story/new" className="text-accent hover:underline">
              Schreib die erste.
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
