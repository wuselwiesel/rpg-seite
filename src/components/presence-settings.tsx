"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { OnlineToggle, useOnline } from "@/components/online-status";
import { setPresenceStatus } from "@/app/profile/actions";
import { PRESENCE_EMOJI_MAX, PRESENCE_EMOJI_PRESETS, PRESENCE_TEXT_MAX, cleanPresenceEmoji } from "@/lib/presence-emoji";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";

// Online-Status im Redaktionsprofil: Online/Offline, dazu ein Emoji (statt des grünen Punkts) und optional ein Text.
export function PresenceSettings() {
  const { enabled, own, setLook } = useOnline();
  const [emoji, setEmoji] = useState(own.emoji ?? "");
  const [text, setText] = useState(own.text ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  if (!enabled) return null;

  const emojiInvalid = emoji.trim() !== "" && !cleanPresenceEmoji(emoji);
  const dirty = emoji.trim() !== (own.emoji ?? "") || text.trim() !== (own.text ?? "");

  function save() {
    setMessage(null);
    startTransition(async () => {
      const error = await setPresenceStatus(emoji, text);
      if (error) {
        setMessage({ ok: false, text: error });
        return;
      }
      const clean = cleanPresenceEmoji(emoji);
      setLook({ emoji: clean, text: text.replace(/\s+/g, " ").trim().slice(0, PRESENCE_TEXT_MAX) || null });
      setMessage({ ok: true, text: "Gespeichert." });
    });
  }

  return (
    <section aria-label="Online-Status" className="flex flex-col gap-3">
      <h2 className="font-serif text-lg text-fg">Online-Status</h2>
      <OnlineToggle className="max-w-xs" />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Emoji statt grünem Punkt">
        {PRESENCE_EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            aria-pressed={emoji === e}
            aria-label={`Emoji ${e}`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${emoji === e ? "bg-accent/15 ring-2 ring-accent" : "bg-surface-2 hover:bg-surface"}`}
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEmoji("")}
          aria-label="Emoji entfernen"
          className="flex h-9 items-center gap-1 rounded-lg bg-surface-2 px-2.5 text-sm text-fg-soft transition hover:text-fg"
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Emoji
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={PRESENCE_EMOJI_MAX}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            aria-invalid={emojiInvalid}
            placeholder="🌙"
            className={`${field} text-center text-lg aria-[invalid=true]:border-red-500`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Text (optional)
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} maxLength={PRESENCE_TEXT_MAX} placeholder="z. B. schreibt gerade" className={field} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || emojiInvalid || !dirty}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:bg-surface-2 disabled:text-muted disabled:opacity-100"
        >
          {pending ? "Speichern …" : "Status speichern"}
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
