"use client";

import { useState, useTransition } from "react";
import { toggleFollowCharacter } from "@/app/characters/actions";

export function FollowButton({
  followerId,
  followedId,
  initialFollowing,
}: {
  followerId: string;
  followedId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleFollowCharacter(followerId, followedId, next);
      if (result) {
        setFollowing(!next);
        setError(result);
      }
    });
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={toggle}
        className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition hover:opacity-90 ${
          following ? "bg-surface-2 text-fg" : "bg-accent-strong text-on-accent-strong"
        }`}
      >
        {following ? "Folge ich" : "Folgen"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
