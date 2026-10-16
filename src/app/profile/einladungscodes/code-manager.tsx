"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { alertDialog } from "@/components/confirm-dialog";
import { createSignupCode, setSignupCodeActive } from "./actions";

export type CodeRow = { code: string; label: string; max_uses: number; uses: number; active: boolean; created_at: string };

const input = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";
const btn = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";

function pretty(code: string) {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className={`${btn} flex items-center gap-1.5`}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
      {label}
    </button>
  );
}

export function CodeManager({ codes, origin }: { codes: CodeRow[]; origin: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [uses, setUses] = useState("1");

  function create() {
    startTransition(async () => {
      const res = await createSignupCode(label, Number(uses));
      if (res.error) {
        void alertDialog(res.error);
        return;
      }
      setLabel("");
      router.refresh();
    });
  }

  function toggle(c: CodeRow) {
    startTransition(async () => {
      const error = await setSignupCodeActive(c.code, !c.active);
      if (error) void alertDialog(error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm text-fg-soft">
          Für wen (optional)
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} className={input} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm text-fg-soft">
          Plätze
          <input type="number" inputMode="numeric" min={1} max={1000} value={uses} onChange={(e) => setUses(e.target.value)} className={input} />
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          Code erzeugen
        </button>
      </form>

      {codes.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Codes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {codes.map((c) => {
            const full = c.uses >= c.max_uses;
            return (
              <li key={c.code} className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 ${c.active && !full ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-base tracking-wider text-fg">{pretty(c.code)}</span>
                  <span className="text-xs text-muted">
                    {c.uses} von {c.max_uses} genutzt{!c.active ? ", gesperrt" : full ? ", aufgebraucht" : ""}
                  </span>
                </div>
                {c.label && <p className="text-sm text-fg-soft">{c.label}</p>}
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={pretty(c.code)} label="Code kopieren" />
                  {origin && <CopyButton text={`${origin}/signup?code=${c.code}`} label="Link kopieren" />}
                  <button type="button" disabled={pending} onClick={() => toggle(c)} className={btn}>
                    {c.active ? "Sperren" : "Wieder freigeben"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
