"use client";

import { useState, useTransition } from "react";
import { removeWorldMember, setWorldMemberRole, transferWorldOwnership } from "../actions";

// Verwalten eines Mitglieds: entfernen (Besitzer:in und Admins; Admins nur normale Mitglieder) und zum Admin ernennen bzw. zurückstufen (nur die Besitzer:in).
export function MemberActions({
  worldId,
  userId,
  name,
  role,
  canRemove,
  canPromote,
  canTransfer = false,
}: {
  worldId: string;
  userId: string;
  name: string;
  role: "member" | "admin";
  canRemove: boolean;
  canPromote: boolean;
  // Nur die Besitzer:in: Besitz der Welt an dieses Mitglied übertragen
  canTransfer?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(task: () => Promise<string | null>) {
    setError(null);
    startTransition(async () => {
      const err = await task();
      if (err) setError(err);
    });
  }

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1">
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      {canPromote && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setWorldMemberRole(worldId, userId, role === "admin" ? "member" : "admin"))}
          className="rounded-md px-2 py-1 text-xs text-fg-soft transition hover:bg-surface-2 hover:text-accent disabled:opacity-50"
        >
          {role === "admin" ? "Admin entziehen" : "Zum Admin ernennen"}
        </button>
      )}
      {canTransfer && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Den Besitz der Welt an ${name} übertragen? Du wirst Admin und kannst die Welt danach verlassen.`)) run(() => transferWorldOwnership(worldId, userId));
          }}
          className="rounded-md px-2 py-1 text-xs text-fg-soft transition hover:bg-surface-2 hover:text-accent disabled:opacity-50"
        >
          Besitz übertragen
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`${name} wirklich aus der Welt entfernen?`)) run(() => removeWorldMember(worldId, userId));
          }}
          className="rounded-md px-2 py-1 text-xs text-fg-soft transition hover:bg-surface-2 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
        >
          Entfernen
        </button>
      )}
    </span>
  );
}
