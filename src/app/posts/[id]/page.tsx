import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { MentionText } from "@/components/mention-text";
import { LikeButton } from "@/components/like-button";
import { formatDateTime } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import type { Comment, Post } from "@/lib/types";
import { CommentForm } from "./comment-form";

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
    .select("*, characters(*), likes(character_id)")
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
        <h1 className="mb-4 font-serif text-3xl text-fg">{post.title}</h1>
        <div
          className="post-content text-fg-soft"
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }}
        />
        <div className="mt-4">
          <LikeButton
            target={{ postId: post.id }}
            initialLiked={(post.likes ?? []).some((l) => myCharacterIds.has(l.character_id))}
            initialCount={post.likes?.length ?? 0}
          />
        </div>
      </article>

      <h2 className="mb-4 font-serif text-xl text-fg">
        Kommentare {comments?.length ? `(${comments.length})` : ""}
      </h2>

      <div className="mb-6 flex flex-col gap-4">
        {comments?.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <CharacterAvatar
              name={comment.characters?.name ?? "?"}
              avatarUrl={comment.characters?.avatar_url}
              size={32}
            />
            <div className="flex-1 rounded-lg border border-line bg-surface px-4 py-2">
              <div className="mb-1 flex items-baseline gap-2">
                <p className="text-sm font-medium text-fg">
                  {comment.characters?.name}
                </p>
                <p className="text-xs text-muted">
                  {formatDateTime(comment.created_at)}
                </p>
              </div>
              <MentionText text={comment.content} className="whitespace-pre-line text-sm text-fg-soft" />
              <div className="mt-2">
                <LikeButton
                  target={{ commentId: comment.id }}
                  initialLiked={(comment.likes ?? []).some((l) => myCharacterIds.has(l.character_id))}
                  initialCount={comment.likes?.length ?? 0}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <CommentForm postId={post.id} characters={mentionableCharacters} />
    </div>
  );
}
