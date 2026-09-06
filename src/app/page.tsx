import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import type { Post } from "@/lib/types";
import { PostCard } from "@/components/post-card";

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
    .select("*, characters(*)")
    .order("created_at", { ascending: false })
    .returns<Post[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-stone-100">Die Chronik</h1>
          <p className="mt-1 text-sm text-stone-400">
            Die gesammelten Geschichten der Gruppe.
          </p>
        </div>
        <Link
          href="/posts/new"
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-amber-600"
        >
          + Neuer Eintrag
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {posts?.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-stone-400">
            Noch keine Einträge. Sei die*der Erste und{" "}
            <Link href="/posts/new" className="text-amber-500 hover:underline">
              schreib etwas
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
