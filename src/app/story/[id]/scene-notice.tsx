"use client";

import { useState, useTransition } from "react";
import { BellRing, X } from "lucide-react";
import { sendSceneNotice } from "../actions";

type Result = { ok: boolean; message: string };

// Eigener Hinweis an die Mitspielenden der Szene: Empfänger:innen wählen, kurzer Text, senden.
export function SceneNotice({ storyPostId, targets }: { storyPostId: string; targets: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(targets.map((t) => t.id));
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  if (targets.length === 0) return null;

  function send() {
    setResult(null);
    startTransition(async () => {
      const res = await sendSceneNotice(storyPostId, { text, characterIds: picked });
      setResult(res);
      if (res.ok) {
        setText("");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg"
        >
          <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
          Hinweis senden
        </button>
        {result && (
          <p role="status" className={`text-xs ${result.ok ? "text-green-700 dark:text-green-400" : "text-muted"}`}>
            {result.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg">Hinweis an Mitspielende</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-full p-1 text-muted hover:bg-surface-3 hover:text-fg">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      {targets.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {targets.map((t) => {
            const on = picked.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-accent bg-accent/15 text-fg" : "border-line text-muted hover:text-fg"}`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        rows={2}
        placeholder="Was soll die Person wissen? z. B. „Ich habe meinen Beitrag ergänzt, schau bitte nochmal rein.“"
        className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={pending || !text.trim() || picked.length === 0}
          className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sende..." : "Senden"}
        </button>
        <span className="text-xs text-muted">{text.length}/200</span>
        {result && !result.ok && (
          <p role="status" className="text-xs text-red-600 dark:text-red-400">
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
