"use client";

import { useActionState } from "react";
import { sendFriendRequest } from "@/app/friends/actions";

export function AddFriendButton({ username }: { username: string }) {
  const [error, formAction, pending] = useActionState(sendFriendRequest, null);

  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="username" value={username} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {pending ? "..." : "Anfragen"}
      </button>
      {error && <p className="max-w-[160px] text-right text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
