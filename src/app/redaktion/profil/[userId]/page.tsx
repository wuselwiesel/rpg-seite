import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { RedaktionPostCard } from "../../redaktion-post-card";
import { formatDate } from "@/lib/format";
import type { Profile, RedaktionPost } from "@/lib/types";

type FeedRow = Omit<RedaktionPost, "poll_options"> & {
  poll_options?: { count: number }[];
  comments?: { count: number }[];
};

export default async function RedaktionProfilePage({ params }: PageProps<"/redaktion/profil/[userId]">) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  if (!profile) notFound();

  const isOwn = userId === user.id;

  const { data: posts } = await supabase
    .from("redaktion_posts")
    .select(
      "*, author:author_id(id, username, nickname, avatar_url), story_post:story_post_id(id, title), poll_options:redaktion_poll_options(count), comments:redaktion_comments(count)",
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<FeedRow[]>();

  const displayName = profile.nickname || profile.username;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-4">
        <CharacterAvatar name={displayName} avatarUrl={profile.avatar_url} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-2xl text-fg">{displayName}</h1>
          <p className="text-sm text-muted">
            @{profile.username} · dabei seit {formatDate(profile.created_at.slice(0, 10))}
          </p>
        </div>
        {isOwn && (
          <Link
            href="/profile"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            Profil bearbeiten
          </Link>
        )}
      </div>

      {!posts || posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          {isOwn ? "Du hast hier noch nichts gepostet." : "Noch nichts zu sehen."}
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
