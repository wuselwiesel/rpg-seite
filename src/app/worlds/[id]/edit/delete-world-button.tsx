"use client";

import { useState, useTransition } from "react";
import { deleteWorld } from "../../actions";

export function DeleteWorldButton({ worldId, worldName }: { worldId: string; worldName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
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
          onClick={() => startTransition(() => deleteWorld(worldId))}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Lösche..." : "Endgültig löschen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setTyped("");
          }}
          className="rounded-md border border-line px-4 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
