import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Post } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";

const SURFACES = ["bg-surface-2", "bg-surface-3", "bg-surface"];

export function PostCard({ post, index = 0 }: { post: Post; index?: number }) {
  const preview = stripHtml(post.content);
  const commentCount = post.comments?.[0]?.count ?? 0;
  const surface = SURFACES[index % SURFACES.length];

  return (
    <article className={`rounded-2xl p-5 ${surface}`}>
      <Link
        href={`/characters/${post.character_id}`}
        className="mb-3 flex w-fit items-center gap-3"
      >
        <CharacterAvatar
          name={post.characters?.name ?? "?"}
          avatarUrl={post.characters?.avatar_url}
          size={36}
        />
        <div>
          <p className="text-sm font-medium text-fg hover:text-accent">
            {post.characters?.name ?? "Unbekannt"}
          </p>
          <p className="text-xs text-muted">{formatDateTime(post.created_at)}</p>
        </div>
      </Link>
      <Link href={`/posts/${post.id}`} className="block">
        <h2 className="mb-1 font-serif text-2xl text-fg">{post.title}</h2>
        {preview && <p className="line-clamp-3 text-sm text-fg-soft">{preview}</p>}
      </Link>
      <Link
        href={`/posts/${post.id}`}
        className="mt-4 flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2} />
        {commentCount > 0 ? `${commentCount} Kommentare` : "Kommentieren"}
      </Link>
    </article>
  );
}
