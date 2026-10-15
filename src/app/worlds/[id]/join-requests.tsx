"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { decideJoinRequest } from "../join-actions";

export type JoinRequest = { id: string; user_id: string; name: string; message: string; created_at: string; role: { id: string; name: string } | null };

// Offene Beitrittsanfragen einer Welt: annehmen, ablehnen oder die Person privat anschreiben (nur Admins).
export function JoinRequests({ worldId, requests }: { worldId: string; requests: JoinRequest[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  void worldId;

  function decide(id: string, approve: boolean, giveRole = false) {
    setError(null);
    startTransition(async () => {
      const err = await decideJoinRequest(id, approve, giveRole);
      if (err) setError(err);
      else router.refresh();
    });
  }

  return (
    <section aria-label="Beitrittsanfragen" className="mb-8">
      <h2 className="mb-3 font-serif text-xl text-fg">
        Beitrittsanfragen <span className="text-muted">{requests.length}</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/redaktion/profil/${r.user_id}`} className="text-sm font-medium text-fg hover:text-accent">
                {r.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/redaktion/chat/mit/${r.user_id}`} className="rounded-full border border-line px-3 py-1 text-sm text-fg-soft transition hover:border-accent hover:text-accent">
                  Anschreiben
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(r.id, false)}
                  className="rounded-full border border-line px-3 py-1 text-sm text-fg-soft transition hover:text-fg disabled:opacity-50"
                >
                  Ablehnen
                </button>
                {r.role ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => decide(r.id, true, false)}
                      className="rounded-full border border-line px-3 py-1 text-sm text-fg-soft transition hover:text-fg disabled:opacity-50"
                    >
                      Nur aufnehmen
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => decide(r.id, true, true)}
                      className="rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
                    >
                      Aufnehmen und Rolle geben
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide(r.id, true)}
                    className="rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
                  >
                    Annehmen
                  </button>
                )}
              </div>
            </div>
            {r.role && (
              <p className="text-sm text-fg">
                Möchte die Rolle{" "}
                <Link href={`/characters/${r.role.id}`} className="font-medium text-accent hover:underline">
                  {r.role.name}
                </Link>
              </p>
            )}
            {r.message && <p className="whitespace-pre-line text-sm text-fg-soft">{r.message}</p>}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
