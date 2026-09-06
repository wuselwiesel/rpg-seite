import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
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
    .select("*, characters(*)")
    .eq("id", id)
    .maybeSingle<Post>();

  if (!post) notFound();

  const { data: comments } = await supabase
    .from("comments")
    .select("*, characters(*)")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .returns<Comment[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <article className="mb-8 rounded-lg border border-stone-800 bg-stone-900/60 p-6">
        <div className="mb-4 flex items-center gap-3">
          <CharacterAvatar
            name={post.characters?.name ?? "?"}
            avatarUrl={post.characters?.avatar_url}
          />
          <div>
            <p className="font-medium text-stone-200">{post.characters?.name}</p>
            <p className="text-xs text-stone-500">{formatDateTime(post.created_at)}</p>
          </div>
        </div>
        <h1 className="mb-4 font-serif text-3xl text-stone-100">{post.title}</h1>
        <div
          className="post-content text-stone-300"
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }}
        />
      </article>

      <h2 className="mb-4 font-serif text-xl text-stone-200">
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
            <div className="flex-1 rounded-lg border border-stone-800 bg-stone-900/40 px-4 py-2">
              <div className="mb-1 flex items-baseline gap-2">
                <p className="text-sm font-medium text-stone-200">
                  {comment.characters?.name}
                </p>
                <p className="text-xs text-stone-500">
                  {formatDateTime(comment.created_at)}
                </p>
              </div>
              <p className="whitespace-pre-line text-sm text-stone-300">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      <CommentForm postId={post.id} />
    </div>
  );
}
