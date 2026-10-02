import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { PostMedia } from "@/components/post-media";
import { MediaCarousel } from "@/components/media-carousel";
import { autolinkHtml } from "@/lib/autolink";
import { timeAgoShort } from "@/lib/format";
import { DeleteRedaktionPostButton } from "./delete-redaktion-post-button";
import { RedaktionPoll } from "./redaktion-poll";
import { RedaktionCommentThread } from "./redaktion-comment-thread";
import { RedaktionReactionBar } from "../redaktion-reaction-bar";
import { summarizeReactions } from "@/lib/redaktion-feed";
import type { RedaktionComment, RedaktionPost, RedaktionPollOption } from "@/lib/types";

type OptionRow = RedaktionPollOption & {
  character: { id: string; name: string; avatar_url: string | null } | null;
  votes: { voter_id: string; voter: { id: string; username: string; nickname: string | null } | null }[];
};

export default async function RedaktionPostPage({ params }: PageProps<"/redaktion/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("redaktion_posts")
    .select("*, author:author_id(id, username, nickname, avatar_url), story_post:story_post_id(id, title)")
    .eq("id", id)
    .maybeSingle<RedaktionPost>();
  if (!post) notFound();

  const isOwn = post.author_id === user.id;

  const [{ data: optionRows }, { data: comments }, { data: reactionRows }] = await Promise.all([
    supabase
      .from("redaktion_poll_options")
      .select("*, character:character_id(id, name, avatar_url), votes:redaktion_poll_votes(voter_id, voter:voter_id(id, username, nickname))")
      .eq("post_id", id)
      .order("position")
      .returns<OptionRow[]>(),
    supabase
      .from("redaktion_comments")
      .select("*, author:author_id(id, username, nickname, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<RedaktionComment[]>(),
    supabase
      .from("redaktion_reactions")
      .select("emoji, user_id, profiles:user_id(username, nickname)")
      .eq("post_id", id)
      .returns<{ emoji: string; user_id: string; profiles: { username: string; nickname: string | null } | null }[]>(),
  ]);

  const options = optionRows ?? [];
  const hasPoll = options.length > 0;
  const myVoteOptionIds = options.filter((o) => o.votes.some((v) => v.voter_id === user.id)).map((o) => o.id);
  const closed = Boolean(post.poll_closes_at && new Date(post.poll_closes_at) < new Date());
  // Ergebnisse sind für andere erst sichtbar, nachdem sie selbst abgestimmt haben (oder die Umfrage
  // geschlossen ist) - die Erstellerin/der Ersteller sieht sie immer.
  const showResults = isOwn || myVoteOptionIds.length > 0 || closed;

  const authorName = post.author?.nickname || post.author?.username || "Unbekannt";
  const contentHtml = autolinkHtml(post.content, { tagHref: "/redaktion" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <article className="mb-8 rounded-xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Link href={`/redaktion/profil/${post.author_id}`}>
            <CharacterAvatar name={authorName} avatarUrl={post.author?.avatar_url} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/redaktion/profil/${post.author_id}`} className="block truncate font-medium text-fg hover:underline">
              {authorName}
            </Link>
            <p className="text-xs text-muted">{timeAgoShort(post.created_at)}</p>
          </div>
          {isOwn && <DeleteRedaktionPostButton postId={post.id} />}
        </div>

        {post.story_post && (
          <Link
            href={`/story/${post.story_post.id}`}
            className="mb-4 flex w-fit max-w-full items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:bg-surface-3 hover:text-fg"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">Aus der Story: {post.story_post.title}</span>
          </Link>
        )}

        {post.media_urls && post.media_urls.length > 1 ? (
          <MediaCarousel urls={post.media_urls} alt="" className="mb-4 overflow-hidden rounded-lg" />
        ) : (
          post.media_url &&
          post.media_type && (
            <PostMedia
              url={post.media_url}
              type={post.media_type}
              alt=""
              className="mb-4 max-h-[75vh] w-full rounded-lg bg-black object-contain"
            />
          )
        )}

        <div className="post-content text-fg-soft" dangerouslySetInnerHTML={{ __html: contentHtml }} />

        {hasPoll && (
          <div className="mt-4">
            <RedaktionPoll
              postId={post.id}
              options={options.map((o) => ({
                id: o.id,
                label: o.label,
                character: o.character,
                voteCount: o.votes.length,
                voters: o.votes.map((v) => v.voter).filter((v): v is NonNullable<typeof v> => Boolean(v)),
              }))}
              multiSelect={post.poll_multi_select}
              showVoterNames={post.poll_show_voters}
              myVoteOptionIds={myVoteOptionIds}
              showResults={showResults}
              closed={closed}
              closesAt={post.poll_closes_at}
            />
          </div>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <RedaktionReactionBar postId={post.id} initialReactions={summarizeReactions(reactionRows ?? [], user.id)} />
        </div>
      </article>

      <RedaktionCommentThread postId={post.id} comments={comments ?? []} currentUserId={user.id} />
    </div>
  );
}
