"use client";

import { confirmDialog } from "@/components/confirm-dialog";
import { useTransition } from "react";
import { acceptFriendRequest, removeFriendship } from "./actions";

export function FriendRequestActions({
  friendshipId,
  mode,
  name,
}: {
  friendshipId: string;
  name?: string;
  mode: "incoming" | "outgoing" | "accepted";
}) {
  const [isPending, startTransition] = useTransition();

  if (mode === "incoming") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => acceptFriendRequest(friendshipId))}
          className="rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          Annehmen
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => removeFriendship(friendshipId))}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:text-fg disabled:opacity-50"
        >
          Ablehnen
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        if (mode === "accepted" && !(await confirmDialog({ message: `Freundschaft${name ? ` mit @${name}` : ""} beenden? Es wird nichts gelöscht; Chats und Beiträge in gemeinsamen Welten bleiben bestehen.`, confirmLabel: "Beenden", danger: true }))) return;
        startTransition(() => removeFriendship(friendshipId));
      }}
      className="rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      {mode === "outgoing" ? "Zurückziehen" : "Entfernen"}
    </button>
  );
}
