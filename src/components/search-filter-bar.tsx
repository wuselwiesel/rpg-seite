"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { formatDate } from "@/lib/format";

export function SearchFilterBar({
  basePath,
  q,
  from,
  to,
  tag,
}: {
  basePath: string;
  q: string;
  from: string;
  to: string;
  tag: string;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [Boolean(q), Boolean(tag), Boolean(from || to)].filter(Boolean).length;
  const hasFilters = activeCount > 0;

  function hrefWithout(omit: "q" | "tag" | "date") {
    const params = new URLSearchParams();
    if (q && omit !== "q") params.set("q", q);
    if (tag && omit !== "tag") params.set("tag", tag);
    if (omit !== "date") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2"
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
          Filter
          {hasFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-strong text-[10px] font-medium text-on-accent-strong">
              {activeCount}
            </span>
          )}
        </button>

        {q && (
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-3 pr-1.5 text-xs text-fg-soft">
            &ldquo;{q}&rdquo;
            <Link href={hrefWithout("q")} aria-label="Textsuche entfernen" className="rounded-full p-0.5 hover:text-accent">
              <X className="h-3 w-3" strokeWidth={2} />
            </Link>
          </span>
        )}
        {tag && (
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-3 pr-1.5 text-xs text-fg-soft">
            #{tag}
            <Link href={hrefWithout("tag")} aria-label="Hashtag entfernen" className="rounded-full p-0.5 hover:text-accent">
              <X className="h-3 w-3" strokeWidth={2} />
            </Link>
          </span>
        )}
        {(from || to) && (
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-3 pr-1.5 text-xs text-fg-soft">
            {from ? formatDate(from) : "…"} – {to ? formatDate(to) : "…"}
            <Link href={hrefWithout("date")} aria-label="Zeitraum entfernen" className="rounded-full p-0.5 hover:text-accent">
              <X className="h-3 w-3" strokeWidth={2} />
            </Link>
          </span>
        )}
        {hasFilters && (
          <Link href={basePath} className="text-xs text-muted hover:text-accent">
            Alle zurücksetzen
          </Link>
        )}
      </div>

      {open && (
        <form
          action={basePath}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-3"
        >
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-muted">
            Suche
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Titel, Text oder #hashtag"
              className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Von
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Bis
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          {tag && <input type="hidden" name="tag" value={tag} />}
          <button
            type="submit"
            className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            Filtern
          </button>
        </form>
      )}
    </div>
  );
}
