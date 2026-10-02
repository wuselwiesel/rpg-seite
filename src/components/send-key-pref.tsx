"use client";

import { setEnterSends, useEnterSends } from "@/lib/send-pref";

const OPTIONS = [
  { on: true, title: "Enter sendet", hint: "Umschalt+Enter macht eine neue Zeile." },
  { on: false, title: "Enter macht eine neue Zeile", hint: "Abschicken mit Strg+Enter (Mac: Cmd+Enter)." },
];

export function SendKeyPref() {
  const enterSends = useEnterSends();
  return (
    <div role="radiogroup" aria-label="Enter-Taste" className="flex flex-col gap-2">
      <p className="text-xs text-muted">Gilt am Computer für Chats und Kommentare, nur auf diesem Gerät. Am Handy bleibt Enter eine neue Zeile.</p>
      {OPTIONS.map((o) => {
        const active = enterSends === o.on;
        return (
          <button
            key={o.title}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setEnterSends(o.on)}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
              active ? "border-accent bg-surface-2" : "border-line hover:bg-surface-2"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                active ? "border-accent" : "border-line"
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{o.title}</span>
              <span className="block text-xs text-muted">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
