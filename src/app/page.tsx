import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import type { Post } from "@/lib/types";
import { SocialPostCard } from "@/components/social-post-card";
import { Wordmark } from "@/components/wordmark";
import { StoriesStrip } from "@/components/stories-strip";
import { FeedSidebar } from "@/components/feed-sidebar";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { escapePostgrestValue } from "@/lib/postgrest";
import { aggregateReactions } from "@/lib/reactions";

export default async function FeedPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const tag = typeof params.tag === "string" ? params.tag.trim().toLowerCase() : "";

  const limit = Math.min(Math.max(Number(params.limit) || 20, 20), 200);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  let postsQuery = supabase
    .from("posts")
    .select("*, characters(*, worlds(name)), comments(count), reactions(emoji, character_id)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    const escaped = escapePostgrestValue(q);
    postsQuery = postsQuery.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }
  if (tag) postsQuery = postsQuery.contains("tags", [tag]);
  if (from) postsQuery = postsQuery.gte("created_at", new Date(from).toISOString());
  if (to) {
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
    postsQuery = postsQuery.lt("created_at", toDate.toISOString());
  }

  const { data: posts } = await postsQuery.returns<Post[]>();
  const activeCharacterSet = new Set([activeCharacter.id]);

  return (
    <div className="flex gap-8 px-3 py-4 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto min-w-0 max-w-[470px] flex-1">
        <Link href="/" aria-label="Wortwinkel" className="mb-3 block w-fit lg:hidden">
          <Wordmark height={34} />
        </Link>
        <Suspense fallback={<div className="mb-5 h-[92px]" />}>
          <StoriesStrip worldId={activeWorld.id} activeCharacterId={activeCharacter.id} />
        </Suspense>

        <SearchFilterBar basePath="/" q={q} from={from} to={to} tag={tag} />

        <div className="flex flex-col gap-2">
          {posts?.length ? (
            posts.map((post) => (
              <SocialPostCard
                key={post.id}
                postId={post.id}
                reactions={aggregateReactions(post.reactions, activeCharacterSet)}
                title={post.title}
                content={post.content}
                createdAt={post.created_at}
                character={post.characters}
                characterHref={`/characters/${post.character_id}`}
                detailHref={`/posts/${post.id}`}
                replyCount={post.comments?.[0]?.count ?? 0}
                worldName={
                  post.characters && post.characters.world_id !== activeWorld.id
                    ? post.characters.worlds?.name
                    : undefined
                }
                tags={post.tags}
                tagHrefBase="/"
                mediaUrl={post.media_url}
                mediaType={post.media_type}
              />
            ))
          ) : q || tag || from || to ? (
            <p className="text-muted">Keine Einträge gefunden.</p>
          ) : (
            <p className="text-muted">
              Noch keine Einträge. Sei die*der Erste und{" "}
              <Link href="/posts/new" className="text-accent hover:underline">
                schreib etwas
              </Link>
              .
            </p>
          )}
        </div>
        {posts && posts.length >= limit && (
          <Link
            href={`/?${new URLSearchParams({ ...(q && { q }), ...(tag && { tag }), ...(from && { from }), ...(to && { to }), limit: String(limit + 20) })}`}
            scroll={false}
            className="mt-4 block rounded-xl bg-surface-2 py-3 text-center text-sm font-medium text-fg-soft transition hover:bg-surface-3"
          >
            Ältere Beiträge laden
          </Link>
        )}
      </div>

      <aside className="hidden w-48 shrink-0 xl:block">
        <Suspense fallback={null}>
          <FeedSidebar userId={user.id} worldId={activeWorld.id} />
        </Suspense>
      </aside>
    </div>
  );
}
