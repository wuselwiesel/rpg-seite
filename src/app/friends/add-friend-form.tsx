"use client";

import { useActionState } from "react";
import { sendFriendRequest } from "./actions";

export function AddFriendForm() {
  const [error, formAction, pending] = useActionState(sendFriendRequest, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          name="username"
          required
          placeholder="Benutzername"
          className="flex-1 rounded-md border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sende..." : "Freund:in hinzufügen"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
