"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteAccount } from "./actions";

type Blocker = { world_id: string; name: string; member_count: number };

export function DeleteAccountSection({ username, blockers }: { username: string; blockers: Blocker[] }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const err = await deleteAccount(confirm);
      if (err) setError(err);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
      >
        Konto löschen
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-red-500/40 p-4">
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-fg-soft">
        <li>Dein Konto, deine Chats, Benachrichtigungen, Freundschaften und Redaktions-Beiträge werden gelöscht.</li>
        <li>Deine Charaktere, Szenen-Nachrichten und Wiki-Seiten bleiben für die anderen in den Welten erhalten, unter „Gelöschter Account“.</li>
        <li>Welten, in denen du allein bist, werden mit gelöscht. Das lässt sich nicht rückgängig machen.</li>
      </ul>

      {blockers.length > 0 ? (
        <div className="rounded-lg bg-surface-2 p-3 text-sm text-fg">
          <p className="mb-2 font-medium">Übertrage zuerst den Besitz dieser Welten:</p>
          <ul className="flex flex-col gap-1">
            {blockers.map((b) => (
              <li key={b.world_id}>
                <Link href={`/worlds/${b.world_id}`} className="text-accent underline underline-offset-2">
                  {b.name}
                </Link>{" "}
                <span className="text-muted">({b.member_count} {b.member_count === 1 ? "Person" : "Personen"})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Zur Bestätigung deinen Benutzernamen eingeben
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={username}
            autoComplete="off"
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-red-500"
          />
        </label>
      )}

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {blockers.length === 0 && (
          <button
            type="button"
            disabled={pending || confirm.trim().toLowerCase() !== username.toLowerCase()}
            onClick={submit}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Lösche …" : "Konto endgültig löschen"}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setError(null);
          }}
          className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:bg-surface-2"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
