"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addExtraWikiType } from "./einstellungen/actions";
import { TypeGlyph } from "@/components/wiki-type-icon";
import { useWikiTypes } from "@/components/wiki-types-context";
import { EXTRA_WIKI_TYPES, type WikiType } from "@/lib/wiki-types";

// Zusatzarten (Ritual, Zeremonie, Magie …), die diese Welt noch nicht hat: ein Klick übernimmt die Vorlage in die Welt.
// `onAdded` bekommt die neue Art, damit der Editor sie gleich wählen kann.
export function ExtraTypesPicker({ onAdded, className = "" }: { onAdded?: (type: WikiType) => void; className?: string }) {
  const router = useRouter();
  const types = useWikiTypes();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const taken = new Set(types.flatMap((t) => [t.id, t.label.toLowerCase()]));
  const available = EXTRA_WIKI_TYPES.filter((t) => !taken.has(t.id) && !taken.has(t.label.toLowerCase()));
  if (available.length === 0) return null;

  async function add(extra: (typeof EXTRA_WIKI_TYPES)[number]) {
    setBusy(extra.id);
    setError(null);
    const result = await addExtraWikiType(extra.id);
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onAdded?.({ ...extra, id: result.id, portrait: false });
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Weitere Arten
      </button>
      {open && (
        <div className="flex flex-wrap gap-2">
          {available.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busy !== null}
              title={t.hint}
              onClick={() => void add(t)}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <TypeGlyph type={{ ...t, portrait: false }} className="h-4 w-4" />
              {busy === t.id ? "…" : t.label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
