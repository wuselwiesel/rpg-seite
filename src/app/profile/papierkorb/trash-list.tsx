"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Share2, Undo2 } from "lucide-react";
import { restoreTrashItem } from "../actions";

export type TrashItem = { id: string; kind: "story_entry" | "relationship"; label: string; deleted_at: string; world_id: string | null };

export function TrashList({ items }: { items: TrashItem[] }) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = items.filter((i) => !gone.has(i.id));
  if (shown.length === 0) return <p className="text-sm text-muted">Der Papierkorb ist leer.</p>;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            {item.kind === "story_entry" ? (
              <MessageSquare className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            ) : (
              <Share2 className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{item.label.trim() || (item.kind === "story_entry" ? "Nachricht" : "Beziehung")}</p>
              <p className="text-xs text-muted">
                {item.kind === "story_entry" ? "Nachricht in einer Szene" : "Beziehung"} · {new Date(item.deleted_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const err = await restoreTrashItem(item.id);
                  if (err) setError(err);
                  else setGone((g) => new Set(g).add(item.id));
                });
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:text-accent disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
              Wiederherstellen
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
