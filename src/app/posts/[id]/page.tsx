import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters, getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { CharacterAvatar } from "@/components/character-avatar";
import { PostMedia } from "@/components/post-media";
import { ReactionBar } from "@/components/reaction-bar";
import { formatDateTime } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import { aggregateReactions } from "@/lib/reactions";
import type { Comment, Post } from "@/lib/types";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

export default async function PostDetailPage({
  params,
}: PageProps<"/posts/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("posts")
    .select("*, characters(*), reactions(emoji, character_id)")
    .eq("id", id)
    .maybeSingle<Post>();

  if (!post) notFound();

  const [{ data: comments }, { data: myCharacters }] = await Promise.all([
    supabase
      .from("comments")
      .select("*, characters(*), likes(character_id)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<Comment[]>(),
    supabase.from("characters").select("id").eq("owner_id", user.id),
  ]);
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id));
  // Reaktionen gehören dem aktiven Charakter: nur seine zählen als "von mir".
  const activeWorld = await getActiveWorld(user.id);
  const activeCharacter = activeWorld ? await getActiveCharacter(user.id, activeWorld.id) : null;
  const activeCharacterSet = new Set(activeCharacter ? [activeCharacter.id] : []);

  const mentionableCharacters = post.characters
    ? await getMentionableCharacters(user.id, post.characters.world_id)
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <article className="mb-8 rounded-lg border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-3">
          <CharacterAvatar
            name={post.characters?.name ?? "?"}
            avatarUrl={post.characters?.avatar_url}
          />
          <div>
            <p className="font-medium text-fg">{post.characters?.name}</p>
            <p className="text-xs text-muted">{formatDateTime(post.created_at)}</p>
          </div>
        </div>
        {post.title && <h1 className="mb-4 font-serif text-3xl text-fg">{post.title}</h1>}
        {post.media_url && post.media_type && (
          <PostMedia
            url={post.media_url}
            type={post.media_type}
            alt="Beitragsbild"
            className="mb-4 max-h-[75vh] w-full rounded-lg bg-black object-contain"
          />
        )}
        <div
          className="post-content text-fg-soft"
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }}
        />
        <div className="mt-4">
          <ReactionBar
            target={{ postId: post.id }}
            initialReactions={aggregateReactions(post.reactions, activeCharacterSet)}
          />
        </div>
      </article>

      <h2 className="mb-4 font-serif text-xl text-fg">
        Kommentare {comments?.length ? `(${comments.length})` : ""}
      </h2>

      <div className="mb-6 flex flex-col gap-4">
        {comments?.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={post.id}
            canManage={myCharacterIds.has(comment.character_id)}
            initialLiked={(comment.likes ?? []).some((l) => myCharacterIds.has(l.character_id))}
            initialLikeCount={comment.likes?.length ?? 0}
          />
        ))}
      </div>

      <CommentForm postId={post.id} characters={mentionableCharacters} />
    </div>
  );
}
