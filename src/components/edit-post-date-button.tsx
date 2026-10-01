"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { updatePostCreatedAt } from "@/app/posts/actions";

// Lokale Uhrzeit im Format für <input type="datetime-local"> (JJJJ-MM-TTThh:mm).
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Erlaubt, den angezeigten Zeitpunkt eines eigenen Beitrags nachträglich zu verschieben -
// z.B. um eine glaubwürdige Zeitlinie mit mehreren Beteiligten herzustellen.
export function EditPostDateButton({ postId, createdAt }: { postId: string; createdAt: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => toLocalInputValue(createdAt));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(toLocalInputValue(createdAt));
          setEditing(true);
        }}
        aria-label="Datum ändern"
        title="Datum ändern"
        className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg"
      >
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        Datum
      </button>
    );
  }

  return (
    <div className="flex w-full min-w-[220px] flex-col items-stretch gap-1.5 sm:w-auto">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending || !value}
          onClick={() =>
            startTransition(async () => {
              const iso = new Date(value).toISOString();
              const err = await updatePostCreatedAt(postId, iso);
              if (err) {
                setError(err);
                return;
              }
              setError(null);
              setEditing(false);
              router.refresh();
            })
          }
          className="rounded-md bg-accent-strong px-2.5 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "..." : "Speichern"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="px-1.5 text-xs text-muted hover:text-fg"
        >
          Abbrechen
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
