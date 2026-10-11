"use client";

import { useActionState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { saveWorldWelcome } from "../../actions";

export function WelcomeEditor({ worldId, initial }: { worldId: string; initial: string }) {
  const [state, action, pending] = useActionState(saveWorldWelcome.bind(null, worldId), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <RichTextEditor name="welcome" initialContent={initial} minHeight={160} showToolbar placeholder="Regeln, wichtige Orte, offene Rollen …" />
      {state && state !== "ok" && <p className="text-sm text-red-600 dark:text-red-400">{state}</p>}
      {state === "ok" && <p className="text-sm text-accent">Gespeichert.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Willkommenstext speichern"}
      </button>
    </form>
  );
}
