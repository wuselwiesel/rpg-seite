"use client";

import { useState, useTransition } from "react";
import { alertDialog } from "@/components/confirm-dialog";
import { setWelcomePrefs } from "@/app/friends/welcome-actions";

// Sichtbarkeit: Beitritte in Welten ankündigen und sich App-weit vorstellen (jeweils sofort wirksam)
export function WelcomePrefs({ announceJoins, introPublic }: { announceJoins: boolean; introPublic: boolean }) {
  const [join, setJoin] = useState(announceJoins);
  const [intro, setIntro] = useState(introPublic);
  const [pending, startTransition] = useTransition();

  function save(nextJoin: boolean, nextIntro: boolean) {
    const prev = { join, intro };
    setJoin(nextJoin);
    setIntro(nextIntro);
    startTransition(async () => {
      const err = await setWelcomePrefs(nextJoin, nextIntro);
      if (err) {
        setJoin(prev.join);
        setIntro(prev.intro);
        void alertDialog(err);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-3 text-sm text-fg-soft">
        <input type="checkbox" checked={join} disabled={pending} onChange={(e) => save(e.target.checked, intro)} className="mt-0.5 h-4 w-4 accent-[var(--accent-strong)]" />
        <span>
          Meinen Beitritt in einer Welt ankündigen
          <span className="block text-xs text-muted">Die Mitglieder der Welt sehen „Willkommen“ mit Befreunden und Begrüßen.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-fg-soft">
        <input type="checkbox" checked={intro} disabled={pending} onChange={(e) => save(join, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent-strong)]" />
        <span>
          Mich in der Redaktion allen vorstellen
          <span className="block text-xs text-muted">Alle in Wortwinkel sehen eine Willkommens-Karte mit deinem Namen.</span>
        </span>
      </label>
    </div>
  );
}
