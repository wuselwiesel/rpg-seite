"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { joinWorld } from "./actions";
import { requestWorldJoin, withdrawWorldJoin } from "./join-actions";

type JoinMode = "open" | "request" | "invite";

// Beitreten je nach Art der Welt: sofort, per Anfrage (mit kurzer Nachricht, Admins genehmigen) oder nur auf Einladung.
export function JoinOrRequestButton({
  worldId,
  joinMode = "open",
  hasRequest = false,
  ownerId,
}: {
  worldId: string;
  joinMode?: JoinMode;
  hasRequest?: boolean;
  // Besitzer:in: Ziel für „Anschreiben“ (privater Chat, solange eine Anfrage offen ist)
  ownerId?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(hasRequest);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const primary = "shrink-0 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";
  const quiet = "shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";

  if (joinMode === "invite") {
    return <span className="shrink-0 rounded-full bg-surface-2 px-4 py-1.5 text-sm text-muted">Nur auf Einladung</span>;
  }

  if (joinMode === "open") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await joinWorld(worldId);
              if (result) setError(result);
            });
          }}
          className={primary}
        >
          {pending ? "Trete bei..." : "Beitreten"}
        </button>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (requested) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted">Anfrage gesendet</span>
          {ownerId && (
            <Link href={`/redaktion/chat/mit/${ownerId}`} className={quiet}>
              Admin anschreiben
            </Link>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const err = await withdrawWorldJoin(worldId);
                if (err) setError(err);
                else setRequested(false);
              })
            }
            className="text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-fg"
          >
            Zurückziehen
          </button>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={primary}>
          Beitritt anfragen
        </button>
      ) : (
        <form
          className="flex w-64 max-w-full flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const err = await requestWorldJoin(worldId, message);
              if (err) setError(err);
              else setRequested(true);
            });
          }}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Kurze Nachricht an die Admins"
            aria-label="Nachricht an die Admins"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-fg">
              Abbrechen
            </button>
            <button type="submit" disabled={pending} className={primary}>
              {pending ? "Sende..." : "Anfrage senden"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
