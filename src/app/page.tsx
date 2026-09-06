import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import type { Post } from "@/lib/types";
import { PostCard } from "@/components/post-card";
import { FeedSidebar } from "@/components/feed-sidebar";
import { CharacterAvatar } from "@/components/character-avatar";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeCharacter = await getActiveCharacter(user.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: posts } = await supabase
    .from("posts")
    .select("*, characters(*), comments(count)")
    .order("created_at", { ascending: false })
    .returns<Post[]>();

  return (
    <div className="flex gap-8 px-6 py-8 lg:px-10">
      <div className="min-w-0 flex-1">
        <h1 className="mb-1 font-serif text-3xl text-fg">Die Chronik</h1>
        <p className="mb-6 text-sm text-muted">Die gesammelten Geschichten der Gruppe.</p>

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
            posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
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
        <FeedSidebar userId={user.id} />
      </aside>
    </div>
  );
}
