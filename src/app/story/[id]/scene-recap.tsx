"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, ScrollText } from "lucide-react";
import { summarizeScene } from "../ai-actions";
import { timeAgoShort } from "@/lib/format";

export type RecapItem = { id: string; name: string; text: string; at: string };

// "Zuletzt geschah": Zusammenfassung des letzten Kapitels plus die neuesten Beiträge.
// Merkt sich pro Szene (im Browser), wann man zuletzt hier war, und zeigt, was seitdem neu ist.
export function SceneRecap({
  storyPostId,
  chapterTitle,
  chapterSummary,
  items,
  aiSummary,
  aiSummaryCount,
  entryCount,
  aiAvailable,
}: {
  storyPostId: string;
  chapterTitle: string | null;
  chapterSummary: string | null;
  items: RecapItem[];
  // KI-Zusammenfassung (gespeichert), Anzahl der Beiträge zum Zeitpunkt der Erstellung und aktuelle Anzahl.
  aiSummary: string | null;
  aiSummaryCount: number | null;
  entryCount: number;
  aiAvailable: boolean;
}) {
  const [since, setSince] = useState<number | null | undefined>(undefined);
  const [summary, setSummary] = useState(aiSummary);
  const [summaryCount, setSummaryCount] = useState(aiSummaryCount);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();

  function runSummary() {
    setAiError(null);
    startAi(async () => {
      const result = await summarizeScene(storyPostId);
      if (result.error) setAiError(result.error);
      else {
        setSummary(result.summary);
        setSummaryCount(result.count);
      }
    });
  }

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
  if (!chapterSummary && shown.length === 0 && !summary && !aiAvailable) return null;
  const outdated = summary !== null && summaryCount !== entryCount;

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
      {summary && (
        <p className="mt-3 text-sm leading-relaxed text-fg-soft">
          <span className="mr-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            KI
          </span>
          {summary}
        </p>
      )}
      {aiAvailable && (!summary || outdated) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runSummary}
            disabled={aiPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:text-fg active:scale-95 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            {aiPending ? "Fasst zusammen..." : summary ? "Zusammenfassung erneuern" : "Mit KI zusammenfassen"}
          </button>
          <span className="text-[11px] text-muted">Der Text geht an Google Gemini.</span>
        </div>
      )}
      {aiError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{aiError}</p>}
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
