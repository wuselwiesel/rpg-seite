"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendFriendRequest } from "@/app/friends/actions";
import type { FriendStatus } from "@/lib/friend-status";

// „Befreunden“ mit Zustand: schon befreundet, angefragt, Anfrage an mich (führt zur Freunde-Seite) oder Knopf zum Anfragen
export function FriendButton({ username, status }: { username: string; status: FriendStatus }) {
  const [sent, setSent] = useState(false);
  const [error, formAction, pending] = useActionState(async (prev: string | null, formData: FormData) => {
    const result = await sendFriendRequest(prev, formData);
    if (!result) setSent(true);
    return result;
  }, null);

  if (status === "friends") return <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Befreundet</span>;
  if (status === "pending_out" || sent) return <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Angefragt</span>;
  if (status === "pending_in") {
    return (
      <Link href="/friends" className="shrink-0 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
        Anfrage beantworten
      </Link>
    );
  }
  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="username" value={username} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {pending ? "…" : "Befreunden"}
      </button>
      {error && <p className="max-w-[160px] text-right text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
