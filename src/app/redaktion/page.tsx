import Link from "next/link";
import { redirect } from "next/navigation";
import { Newspaper, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RedaktionPostCard } from "./redaktion-post-card";
import type { RedaktionPost } from "@/lib/types";

type FeedRow = Omit<RedaktionPost, "poll_options"> & {
  poll_options?: { count: number }[];
  comments?: { count: number }[];
};

export default async function RedaktionPage({ searchParams }: PageProps<"/redaktion">) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag.trim().toLowerCase() : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("redaktion_posts")
    .select(
      "*, author:author_id(id, username, nickname, avatar_url), story_post:story_post_id(id, title), poll_options:redaktion_poll_options(count), comments:redaktion_comments(count)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (tag) query = query.contains("tags", [tag]);

  const { data: posts } = await query.returns<FeedRow[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-serif text-3xl text-fg">
          <Newspaper className="h-7 w-7 text-fg-soft" strokeWidth={1.75} />
          Redaktion
        </h1>
        <Link
          href="/redaktion/new"
          className="flex items-center gap-1.5 rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <PenLine className="h-4 w-4" strokeWidth={2} />
          Neu
        </Link>
      </div>
      <p className="mb-6 text-sm text-fg-soft">
        Beiträge, Umfragen und Diskussionen vom Account selbst - sichtbar für dich und deine Freund:innen, losgelöst von Charakteren und Welten.
      </p>

      {tag && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-fg-soft">Gefiltert nach</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-medium text-fg">#{tag}</span>
          <Link href="/redaktion" className="text-accent hover:underline">
            Zurücksetzen
          </Link>
        </div>
      )}

      {!posts || posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          {tag ? "Keine Beiträge mit diesem Tag." : "Noch nichts in der Redaktion. Starte den ersten Beitrag."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <RedaktionPostCard
              key={post.id}
              post={post}
              isOwn={post.author_id === user.id}
              pollOptionCount={post.poll_options?.[0]?.count ?? 0}
              commentCount={post.comments?.[0]?.count ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
