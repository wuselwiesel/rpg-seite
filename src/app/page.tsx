import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import type { Post } from "@/lib/types";
import { EntryCard } from "@/components/entry-card";
import { FeedSidebar } from "@/components/feed-sidebar";
import { CharacterAvatar } from "@/components/character-avatar";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: posts } = await supabase
    .from("posts")
    .select("*, characters(*, worlds(name)), comments(count)")
    .order("created_at", { ascending: false })
    .returns<Post[]>();

  return (
    <div className="flex gap-8 px-6 py-8 lg:px-10">
      <div className="min-w-0 flex-1">
        <h1 className="mb-1 font-serif text-3xl text-fg">Die Chronik</h1>
        <p className="mb-6 text-sm text-muted">Die neuesten Beiträge deiner Freunde.</p>

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
              />
            ))
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
