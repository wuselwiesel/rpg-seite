import Link from "next/link";
import { CharacterAvatar } from "./character-avatar";
import type { Post } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-lg border border-stone-800 bg-stone-900/60 p-5 transition hover:border-amber-700/60"
    >
      <div className="mb-3 flex items-center gap-3">
        <CharacterAvatar
          name={post.characters?.name ?? "?"}
          avatarUrl={post.characters?.avatar_url}
          size={32}
        />
        <div>
          <p className="text-sm font-medium text-stone-200">
            {post.characters?.name ?? "Unbekannt"}
          </p>
          <p className="text-xs text-stone-500">{formatDateTime(post.created_at)}</p>
        </div>
      </div>
      <h2 className="mb-1 font-serif text-2xl text-stone-100">{post.title}</h2>
      <p className="line-clamp-3 text-sm whitespace-pre-line text-stone-400">
        {post.content}
      </p>
    </Link>
  );
}
