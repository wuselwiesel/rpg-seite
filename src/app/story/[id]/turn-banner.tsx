"use client";

import { useState, useTransition } from "react";
import { BellRing, Hourglass, PenLine } from "lucide-react";
import { sendTurnReminder } from "../actions";

export function TurnBanner({
  storyPostId,
  turnName,
  waitingName,
  isMine,
}: {
  storyPostId: string;
  turnName: string;
  waitingName: string | null;
  isMine: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function remind() {
    setResult(null);
    startTransition(async () => setResult(await sendTurnReminder(storyPostId)));
  }

  if (isMine) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-accent-strong/15 px-4 py-3 text-sm">
        <PenLine className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <p className="text-fg">
          <span className="font-medium">{turnName}, du bist dran.</span>
          {waitingName && <span className="text-fg-soft"> {waitingName} wartet auf dich.</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
      <Hourglass className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
      <p className="text-fg-soft">
        <span className="font-medium text-fg">{turnName}</span> ist dran.
      </p>
      <button
        type="button"
        onClick={remind}
        disabled={pending}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg disabled:opacity-50"
      >
        <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
        {pending ? "Sende..." : "Erinnern"}
      </button>
      {result && (
        <p
          role="status"
          className={`w-full text-xs ${result.ok ? "text-green-700 dark:text-green-400" : "text-muted"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
