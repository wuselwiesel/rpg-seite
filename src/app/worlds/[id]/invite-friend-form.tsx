"use client";

import { useActionState } from "react";
import { addWorldMember } from "../actions";
import type { Profile } from "@/lib/types";

export function InviteFriendForm({
  worldId,
  friends,
}: {
  worldId: string;
  friends: Profile[];
}) {
  const action = addWorldMember.bind(null, worldId);
  const [error, formAction, pending] = useActionState(action, null);

  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted">
        Alle deine Freund:innen sind schon hier, oder du hast noch keine hinzugefügt.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex gap-2">
      <select
        name="friend_user_id"
        required
        className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      >
        {friends.map((friend) => (
          <option key={friend.id} value={friend.id}>
            @{friend.username}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Lade ein..." : "Einladen"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
