"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "@/app/posts/actions";

export function LikeButton({
  target,
  initialLiked,
  initialCount,
}: {
  target: { postId: string } | { commentId: string };
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function handleClick() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    startTransition(async () => {
      await toggleLike(target);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-sm transition ${
        liked ? "text-accent" : "text-muted hover:text-fg"
      }`}
    >
      <Heart className="h-4 w-4" strokeWidth={2} fill={liked ? "currentColor" : "none"} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
