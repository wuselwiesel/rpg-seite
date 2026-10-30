"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alertDialog } from "@/components/confirm-dialog";
import { ImagePicker } from "@/components/ticket-images";
import { CATEGORIES, KINDS, categoryFromPath, deviceSummary, isCategory, pathFromReferrer, type TicketCategory, type TicketKind } from "@/lib/tickets";
import { uploadTicketImages } from "@/lib/ticket-upload";
import { createTicket } from "../actions";

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

// Neues Ticket: Art, Titel, Beschreibung, Screenshots; Gerät und, ohne eigene Angabe, die Seite davor werden mitgeschickt
export function ReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<TicketKind>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [page, setPage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  // Kategorie: ohne eigene Wahl passend zur Seite davor (oder zur eingetragenen Seite) vorbelegt
  const [pick, setPick] = useState<TicketCategory | "none" | null>(null);
  const referrerPath = useSyncExternalStore(
    () => () => {},
    () => pathFromReferrer(document.referrer, window.location.origin),
    () => "",
  );
  const category = pick === "none" ? null : (pick ?? categoryFromPath(page.trim() || referrerPath));

  function send() {
    startTransition(async () => {
      const up = await uploadTicketImages(files);
      if ("error" in up) {
        void alertDialog(up.error);
        return;
      }
      const device = deviceSummary({
        userAgent: navigator.userAgent,
        width: window.innerWidth,
        height: window.innerHeight,
        touch: window.matchMedia("(pointer: coarse)").matches,
        dark: window.matchMedia("(prefers-color-scheme: dark)").matches || document.documentElement.dataset.theme === "dark",
      });
      const res = await createTicket({ kind, title, body, page: page.trim() || pathFromReferrer(document.referrer, window.location.origin), device, images: up.paths, category });
      if (res.error || !res.id) {
        void alertDialog(res.error ?? "Das hat nicht geklappt.");
        return;
      }
      router.push(`/redaktion/tickets/${res.id}`);
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
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={6} placeholder="Beschreibung" aria-label="Beschreibung" className={input} />
      <ImagePicker files={files} onChange={setFiles} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={page} onChange={(e) => setPage(e.target.value)} maxLength={300} placeholder="Seite (optional)" aria-label="Seite" className={input} />
        <select
          value={category ?? ""}
          onChange={(e) => setPick(isCategory(e.target.value) ? e.target.value : "none")}
          aria-label="Kategorie"
          className={input}
        >
          <option value="">Kategorie (optional)</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button type="submit" disabled={pending || !title.trim()} className="rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          Senden
        </button>
      </div>
    </form>
  );
}
