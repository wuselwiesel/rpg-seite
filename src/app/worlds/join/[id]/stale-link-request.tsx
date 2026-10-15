"use client";

import { useState, useTransition } from "react";
import { requestWorldJoin } from "../../join-actions";

// Alter Einladungslink ohne Schlüssel in einer Welt „Nur auf Einladung“: Beitritt anfragen, die Admins entscheiden
export function StaleLinkRequest({ worldId, hasRequest }: { worldId: string; hasRequest: boolean }) {
  const [done, setDone] = useState(hasRequest);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) return <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-fg-soft">Anfrage gesendet. Du bekommst eine Meldung, sobald die Admins entscheiden.</p>;

  return (
    <form
      className="flex w-full max-w-xs flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const err = await requestWorldJoin(worldId, message, null, true);
          if (err) setError(err);
          else setDone(true);
        });
      }}
    >
      <p className="text-sm text-fg-soft">Dieser Link enthält keinen Schlüssel. Du kannst den Beitritt anfragen, die Admins entscheiden.</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Nachricht an die Admins (optional)"
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      />
      <button type="submit" disabled={pending} className="rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
        {pending ? "Sende …" : "Beitritt anfragen"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
