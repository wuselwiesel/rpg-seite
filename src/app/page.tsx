import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import type { Post } from "@/lib/types";
import { EntryCard } from "@/components/entry-card";
import { FeedSidebar } from "@/components/feed-sidebar";
import { CharacterAvatar } from "@/components/character-avatar";
import { LikeButton } from "@/components/like-button";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { escapePostgrestValue } from "@/lib/postgrest";

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
    .select("*, characters(*, worlds(name)), comments(count), likes(character_id)")
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
    <div className="flex gap-8 px-6 py-8 lg:px-10">
      <div className="min-w-0 flex-1">
        <h1 className="mb-1 font-serif text-3xl text-fg">Die Chronik</h1>
        <p className="mb-6 text-sm text-muted">Die neuesten Beiträge deiner Freunde.</p>

        <SearchFilterBar basePath="/" q={q} from={from} to={to} tag={tag} />

        <Link
          href="/posts/new"
          className="mb-6 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition hover:bg-surface-2"
        >
          <CharacterAvatar
            name={activeCharacter.name}
            avatarUrl={activeCharacter.avatar_url}
            size={36}
          />
          <span className="text-sm text-muted">
            Was erlebt {activeCharacter.name} gerade?
          </span>
        </Link>

        <div className="flex flex-col gap-4">
          {posts?.length ? (
            posts.map((post, index) => (
              <EntryCard
                key={post.id}
                id={post.id}
                title={post.title}
                content={post.content}
                createdAt={post.created_at}
                character={post.characters}
                characterHref={`/characters/${post.character_id}`}
                detailHref={`/posts/${post.id}`}
                replyCount={post.comments?.[0]?.count ?? 0}
                index={index}
                worldName={
                  post.characters && post.characters.world_id !== activeWorld.id
                    ? post.characters.worlds?.name
                    : undefined
                }
                likeButton={
                  <LikeButton
                    target={{ postId: post.id }}
                    initialLiked={(post.likes ?? []).some((l) => myCharacterIds.has(l.character_id))}
                    initialCount={post.likes?.length ?? 0}
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
        <FeedSidebar userId={user.id} worldId={activeWorld.id} worldName={activeWorld.name} />
      </aside>
    </div>
  );
}
