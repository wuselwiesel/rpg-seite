import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import type { Post } from "@/lib/types";
import { SocialPostCard } from "@/components/social-post-card";
import { StoriesStrip } from "@/components/stories-strip";
import { FeedSidebar } from "@/components/feed-sidebar";
import { ReactionBar } from "@/components/reaction-bar";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { escapePostgrestValue } from "@/lib/postgrest";
import { aggregateReactions } from "@/lib/reactions";

export default async function FeedPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const tag = typeof params.tag === "string" ? params.tag.trim().toLowerCase() : "";

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
    .order("created_at", { ascending: false });

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

  const [{ data: posts }, { data: myCharacters }] = await Promise.all([
    postsQuery.returns<Post[]>(),
    supabase.from("characters").select("id").eq("owner_id", user.id),
  ]);
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id));

  return (
    <div className="flex gap-8 px-3 py-4 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto min-w-0 max-w-[470px] flex-1">
        <StoriesStrip worldId={activeWorld.id} activeCharacterId={activeCharacter.id} />

        <SearchFilterBar basePath="/" q={q} from={from} to={to} tag={tag} />

        <div className="flex flex-col gap-2">
          {posts?.length ? (
            posts.map((post) => (
              <SocialPostCard
                key={post.id}
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
                reactionBar={
                  <ReactionBar
                    target={{ postId: post.id }}
                    initialReactions={aggregateReactions(post.reactions, myCharacterIds)}
                  />
                }
                tags={post.tags}
                tagHrefBase="/"
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
      </div>

      <aside className="hidden w-72 shrink-0 lg:block">
        <FeedSidebar userId={user.id} worldId={activeWorld.id} />
      </aside>
    </div>
  );
}
