import Link from "next/link";
import { CharacterAvatar } from "./character-avatar";
import type { Post } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export function PostCard({ post }: { post: Post }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-5 transition hover:border-amber-700/60">
      <Link
        href={`/characters/${post.character_id}`}
        className="mb-3 flex w-fit items-center gap-3"
      >
        <CharacterAvatar
          name={post.characters?.name ?? "?"}
          avatarUrl={post.characters?.avatar_url}
          size={32}
        />
        <div>
          <p className="text-sm font-medium text-stone-200 hover:text-amber-400">
            {post.characters?.name ?? "Unbekannt"}
          </p>
          <p className="text-xs text-stone-500">{formatDateTime(post.created_at)}</p>
        </div>
      </Link>
      <Link href={`/posts/${post.id}`} className="block">
        <h2 className="mb-1 font-serif text-2xl text-stone-100">{post.title}</h2>
        <p className="line-clamp-3 text-sm whitespace-pre-line text-stone-400">
          {post.content}
        </p>
      </Link>
    </div>
  );
}
