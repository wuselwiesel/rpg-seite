"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createRelationship } from "../actions";
import { RelationshipFields } from "./relationship-fields";
import type { Character } from "@/lib/types";

export function RelationshipForm({
  characters,
  initialA,
  initialB,
  onDone,
  open: openProp,
}: {
  characters: Character[];
  initialA?: string;
  initialB?: string;
  onDone?: () => void;
  // Direkt aufgeklappt (z. B. im Netz nach Auswahl zweier Figuren)
  open?: boolean;
}) {
  const [error, formAction, pending] = useActionState(createRelationship, null);
  const [open, setOpen] = useState(!!openProp);
  const [resetKey, setResetKey] = useState(0);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setResetKey((k) => k + 1);
      setOpen(false);
      onDone?.();
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);

  if (characters.length < 2) {
    return <p className="text-sm text-muted">Du brauchst mindestens zwei Charaktere in der Welt.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Beziehung hinzufügen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <RelationshipFields key={resetKey} characters={characters} initial={{ character_a_id: initialA, character_b_id: initialB }} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichere..." : "Hinzufügen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDone?.();
          }}
          className="text-sm text-muted hover:text-fg"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
