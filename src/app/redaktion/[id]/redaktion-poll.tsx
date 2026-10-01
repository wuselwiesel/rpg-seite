"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { voteRedaktionPoll } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { formatDateTime } from "@/lib/format";

type Voter = { id: string; username: string; nickname: string | null };

type Option = {
  id: string;
  label: string;
  character: { id: string; name: string; avatar_url: string | null } | null;
  voteCount: number;
  voters: Voter[];
};

export function RedaktionPoll({
  postId,
  options,
  multiSelect,
  showVoterNames,
  myVoteOptionIds,
  showResults,
  closed,
  closesAt,
}: {
  postId: string;
  options: Option[];
  multiSelect: boolean;
  showVoterNames: boolean;
  myVoteOptionIds: string[];
  showResults: boolean;
  closed: boolean;
  closesAt: string | null;
}) {
  const [mine, setMine] = useState(new Set(myVoteOptionIds));
  // Optimistische Zähler-Deltas pro Option, damit der eigene Klick sofort sichtbar ist.
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasVoted = mine.size > 0;
  const revealed = showResults || hasVoted;
  const totalVotes = options.reduce((sum, o) => sum + o.voteCount + (deltas[o.id] ?? 0), 0);

  function vote(optionId: string) {
    if (closed) return;
    setError(null);
    const willSelect = !mine.has(optionId);
    setMine((prev) => {
      const next = new Set(prev);
      if (willSelect) {
        if (!multiSelect) {
          for (const id of next) {
            if (id !== optionId) {
              next.delete(id);
              setDeltas((d) => ({ ...d, [id]: (d[id] ?? 0) - 1 }));
            }
          }
        }
        next.add(optionId);
      } else {
        next.delete(optionId);
      }
      return next;
    });
    setDeltas((d) => ({ ...d, [optionId]: (d[optionId] ?? 0) + (willSelect ? 1 : -1) }));
    startTransition(async () => {
      const err = await voteRedaktionPoll(postId, optionId);
      if (err) setError(err);
    });
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const selected = mine.has(o.id);
          const count = o.voteCount + (deltas[o.id] ?? 0);
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <button
              key={o.id}
              type="button"
              disabled={closed || pending}
              onClick={() => vote(o.id)}
              className={`relative overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed ${
                selected ? "border-accent-strong" : "border-line hover:border-fg-soft"
              }`}
            >
              {revealed && (
                <span
                  className="absolute inset-y-0 left-0 bg-accent/15"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-fg">
                  {o.character && <CharacterAvatar name={o.character.name} avatarUrl={o.character.avatar_url} size={22} />}
                  {o.label}
                </span>
                {revealed && (
                  <span className="shrink-0 text-xs text-fg-soft">
                    {count} {count === 1 ? "Stimme" : "Stimmen"} · {pct}%
                  </span>
                )}
              </span>
              {revealed && showVoterNames && o.voters.length > 0 && (
                <span className="relative mt-1 block truncate text-xs text-muted">
                  {o.voters.map((v) => v.nickname || v.username).join(", ")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {!revealed
            ? "Ergebnisse werden sichtbar, sobald du abgestimmt hast."
            : `${totalVotes} ${totalVotes === 1 ? "Stimme" : "Stimmen"} insgesamt`}
        </span>
        {closed ? (
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" strokeWidth={2} />
            Geschlossen
          </span>
        ) : (
          closesAt && <span>Schließt {formatDateTime(closesAt)}</span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
