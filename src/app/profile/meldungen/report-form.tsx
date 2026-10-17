"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alertDialog } from "@/components/confirm-dialog";
import { KINDS, deviceSummary, pathFromReferrer, type TicketKind } from "@/lib/tickets";
import { createTicket } from "./actions";

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

// Meldeformular: Art, Titel, Beschreibung; Gerät und, ohne eigene Angabe, die Seite davor werden mitgeschickt
export function ReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<TicketKind>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [page, setPage] = useState("");

  function send() {
    startTransition(async () => {
      const device = deviceSummary({
        userAgent: navigator.userAgent,
        width: window.innerWidth,
        height: window.innerHeight,
        touch: window.matchMedia("(pointer: coarse)").matches,
        dark: window.matchMedia("(prefers-color-scheme: dark)").matches || document.documentElement.dataset.theme === "dark",
      });
      const error = await createTicket({ kind, title, body, page: page.trim() || pathFromReferrer(document.referrer, window.location.origin), device });
      if (error) {
        void alertDialog(error);
        return;
      }
      setTitle("");
      setBody("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-col gap-3"
    >
      <div role="radiogroup" aria-label="Art" className="flex gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`rounded-full border px-3 py-1 text-sm transition ${kind === k.key ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Titel" aria-label="Titel" className={input} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={5} placeholder="Beschreibung" aria-label="Beschreibung" className={input} />
      <input value={page} onChange={(e) => setPage(e.target.value)} maxLength={300} placeholder="Seite (optional)" aria-label="Seite" className={input} />
      <div>
        <button type="submit" disabled={pending || !title.trim()} className="rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          Senden
        </button>
      </div>
    </form>
  );
}
