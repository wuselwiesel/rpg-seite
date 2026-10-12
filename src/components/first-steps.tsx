"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, X } from "lucide-react";

export type FirstStep = { id: string; label: string; href: string; done: boolean };

// Kleine Liste für neue Mitglieder: hakt sich aus den vorhandenen Daten selbst ab, verschwindet, wenn alles erledigt
// ist oder weggeklickt wird (pro Welt im Browser gemerkt).
export function FirstSteps({ worldId, steps }: { worldId: string; steps: FirstStep[] }) {
  const key = `wortwinkel:first-steps-hidden:${worldId}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let h = false;
    try {
      h = localStorage.getItem(key) === "1";
    } catch {
      /* egal */
    }
    Promise.resolve().then(() => setHidden(h));
  }, [key]);

  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* egal */
    }
  }

  return (
    <section aria-label="Erste Schritte" className="mb-4 rounded-2xl border border-line bg-surface p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-fg">
          Erste Schritte <span className="text-muted">{done}/{steps.length}</span>
        </h2>
        <button type="button" onClick={hide} aria-label="Erste Schritte ausblenden" className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <ul className="flex flex-col">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-surface-2 ${s.done ? "text-muted line-through" : "text-fg"}`}
            >
              {s.done ? <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} /> : <Circle className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />}
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
