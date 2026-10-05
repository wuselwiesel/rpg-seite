"use client";

import { useState, useTransition } from "react";
import { deleteWorld } from "../../actions";

export function DeleteWorldButton({ worldId, worldName }: { worldId: string; worldName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
      >
        Welt löschen
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
      <a
        href={`/worlds/${worldId}/export`}
        download
        className="w-fit rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
      >
        Welt vorher als Datei sichern
      </a>
      <p className="text-sm text-fg">
        Gib <span className="font-medium">{worldName}</span> ein, um das endgültige Löschen für alle
        Mitglieder zu bestätigen.
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoFocus
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={typed !== worldName || isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await deleteWorld(worldId);
              if (result) setError(result);
            });
          }}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Lösche..." : "Endgültig löschen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError(null);
          }}
          className="rounded-md border border-line px-4 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2"
        >
          Abbrechen
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
