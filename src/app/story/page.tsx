import Link from "next/link";
import { PenLine } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { EntryCard } from "@/components/entry-card";
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
  const showArchived = params.archived === "1";
  const bookmarkedOnly = params.bookmarked === "1";

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

  const [{ data: storyPosts }, { data: arcs }] = await Promise.all([
    storyQuery.returns<StoryPost[]>(),
    supabase
      .from("story_arcs")
      .select("*, story_posts(count)")
      .eq("world_id", activeWorld.id)
      .order("name")
      .returns<(StoryArc & { story_posts: { count: number }[] })[]>(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-1 flex items-center gap-2">
        <PenLine className="h-6 w-6 text-accent" strokeWidth={2} />
        <h1 className="font-serif text-3xl text-fg">Story</h1>
      </div>
      <p className="mb-6 text-sm text-muted">Die Handlungsstränge von {activeWorld.name}.</p>

      {arcs && arcs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
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

      <SearchFilterBar basePath="/story" q={q} from={from} to={to} tag={tag} />

      <div className="mb-4 flex flex-wrap gap-2">
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

      <Link
        href="/story/new"
        className="mb-6 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition hover:bg-surface-2"
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

      <div className="flex flex-col gap-4">
        {storyPosts?.length ? (
          storyPosts.map((post, index) => (
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
            />
          ))
        ) : q || tag || from || to || arc ? (
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
