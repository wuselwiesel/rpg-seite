"use client";

import { useState, useTransition } from "react";
import { publishWikiPage } from "../actions";

export function PublishButton({ wikiPageId }: { wikiPageId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError((await publishWikiPage(wikiPageId)) ?? null);
          })
        }
        className="rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Veröffentliche …" : "Veröffentlichen"}
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
