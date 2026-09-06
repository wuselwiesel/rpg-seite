"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { followWorld, unfollowWorld } from "@/app/worlds/actions";

export function FollowWorldButton({
  worldId,
  initialFollowing,
}: {
  worldId: string;
  initialFollowing: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      if (initialFollowing) {
        await unfollowWorld(worldId);
      } else {
        await followWorld(worldId);
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={toggle}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        initialFollowing
          ? "border-line text-fg-soft hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
          : "border-line text-fg-soft hover:border-accent hover:text-accent"
      }`}
    >
      {initialFollowing ? "Entfolgen" : "Folgen"}
    </button>
  );
}
