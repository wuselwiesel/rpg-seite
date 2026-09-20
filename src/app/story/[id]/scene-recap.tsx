"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { timeAgoShort } from "@/lib/format";

export type RecapItem = { id: string; name: string; text: string; at: string };

// "Zuletzt geschah": Zusammenfassung des letzten Kapitels plus die neuesten Beiträge.
// Merkt sich pro Szene (im Browser), wann man zuletzt hier war, und zeigt, was seitdem neu ist.
export function SceneRecap({
  storyPostId,
  chapterTitle,
  chapterSummary,
  items,
}: {
  storyPostId: string;
  chapterTitle: string | null;
  chapterSummary: string | null;
  items: RecapItem[];
}) {
  const [since, setSince] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    const key = `scene-seen:${storyPostId}`;
    let previous: number | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) previous = Number(raw) || null;
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // ignore
    }
    Promise.resolve().then(() => setSince(previous));
  }, [storyPostId]);

  if (since === undefined) return null;
  const fresh = since ? items.filter((i) => new Date(i.at).getTime() > since) : [];
  const shown = since ? (fresh.length ? fresh : []) : items.slice(-3);
  if (!chapterSummary && shown.length === 0) return null;

  return (
    <details open={!since || fresh.length > 0} className="mb-6 rounded-xl bg-surface-2 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-fg">
        <ScrollText className="h-4 w-4 text-accent" strokeWidth={2} />
        Zuletzt geschah
        {since && fresh.length > 0 && (
          <span className="ml-1 rounded-full bg-accent-strong px-2 py-0.5 text-xs font-medium text-on-accent-strong">
            {fresh.length} neu seit deinem letzten Besuch
          </span>
        )}
      </summary>
      {chapterSummary && (
        <p className="mt-3 text-sm text-fg-soft">
          <span className="font-medium text-fg">{chapterTitle ? `${chapterTitle}: ` : ""}</span>
          {chapterSummary}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {shown.slice(-5).map((i) => (
            <li key={i.id} className="text-sm text-fg-soft">
              <span className="font-medium text-fg">{i.name}</span>{" "}
              <span className="text-xs text-muted">{timeAgoShort(i.at)}</span>
              <span className="block line-clamp-2">{i.text}</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
