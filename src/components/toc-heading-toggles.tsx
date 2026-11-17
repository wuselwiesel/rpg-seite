"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { alertDialog } from "@/components/confirm-dialog";
import { setHeadingHidden } from "@/app/wiki/actions";

type Item = { id: string; key: string; shown: boolean };

// Hängt an jede Überschrift des gerenderten Wiki-Artikels ein kleines Auge: „Im Verzeichnis ausblenden / zeigen“ (nur für Personen, die die Seite
// bearbeiten dürfen). Funktioniert wie PdfEmbeds: sucht die Überschriften per id im Text und zeichnet den Knopf per Portal hinein.
export function TocHeadingToggles({ pageId, items }: { pageId: string; items: Item[] }) {
  const router = useRouter();
  const [targets, setTargets] = useState<(Item & { el: HTMLElement })[]>([]);
  // Bis die Seite neu geladen ist, gilt die eigene Änderung sofort
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    const found: (Item & { el: HTMLElement })[] = [];
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (!el || el.closest(".ProseMirror")) continue;
      el.classList.add("group");
      found.push({ ...it, el });
    }
    Promise.resolve().then(() => setTargets(found));
  }, [items]);

  function toggle(it: Item, shown: boolean) {
    setOverride((o) => ({ ...o, [it.key]: !shown }));
    startTransition(async () => {
      const err = await setHeadingHidden(pageId, it.key, shown);
      if (err) {
        setOverride((o) => {
          const { [it.key]: _drop, ...rest } = o;
          void _drop;
          return rest;
        });
        void alertDialog(err);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {targets.map((t) => {
        const shown = override[t.key] ?? t.shown;
        return createPortal(
          <button
            type="button"
            onClick={() => toggle(t, shown)}
            title={shown ? "Im Verzeichnis ausblenden" : "Im Verzeichnis zeigen"}
            aria-label={shown ? "Im Verzeichnis ausblenden" : "Im Verzeichnis zeigen"}
            aria-pressed={!shown}
            contentEditable={false}
            className={`ml-2 inline-flex translate-y-[-1px] items-center rounded-full p-1 align-middle text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${shown ? "" : "!opacity-100 text-accent"}`}
          >
            {shown ? <Eye className="h-3.5 w-3.5" strokeWidth={2} /> : <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>,
          t.el,
          t.id,
        );
      })}
    </>
  );
}
