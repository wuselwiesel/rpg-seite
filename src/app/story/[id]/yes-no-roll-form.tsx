"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Dices, EyeOff } from "lucide-react";
import { createYesNoRoll, type YesNoRollState } from "../actions";

const INITIAL_STATE: YesNoRollState = { error: null };

// Ja/Nein-Wurf: die Frage, „Geheim“ und Würfeln. Offen steht er wie ein normaler Wurf in der Szene, geheim sieht ihn nur die würfelnde Person.
export function YesNoRollForm({
  storyPostId,
  worldId,
  writerId,
  onTyping,
}: {
  storyPostId: string;
  worldId: string;
  writerId: string;
  onTyping?: () => void;
}) {
  const action = createYesNoRoll.bind(null, storyPostId, worldId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setLabel("");
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <input type="hidden" name="character_id" value={writerId} />
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Frage
        <input
          type="text"
          name="label"
          value={label}
          maxLength={200}
          onChange={(e) => {
            setLabel(e.target.value);
            onTyping?.();
          }}
          required
          placeholder="z. B. Folgt uns jemand?"
          className="rounded-md border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-fg-soft">
        <input type="checkbox" name="secret" checked={secret} onChange={(e) => setSecret(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        <EyeOff className="h-4 w-4" strokeWidth={2} />
        Geheim
      </label>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          <Dices className="h-4 w-4" strokeWidth={2} />
          {pending ? "Würfle..." : "Würfeln"}
        </button>
        {!pending && !state.error && state.answer != null && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              state.answer ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-red-500/15 text-red-700 dark:text-red-400"
            }`}
          >
            {state.secret && <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />}
            {state.answer ? "Ja" : "Nein"}
          </span>
        )}
      </div>
    </form>
  );
}
