"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { CALLOUT_KINDS, type CalloutKind } from "@/lib/callout-kinds";

const KIND_LABEL: Record<CalloutKind, string> = { info: "Info", tipp: "Tipp", achtung: "Achtung", gefahr: "Gefahr" };

const btn = "rounded px-2 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-30";
const idle = "text-fg-soft hover:bg-surface-2 hover:text-fg";
const on = "bg-accent-strong text-on-accent-strong";

// Textbausteine für Wiki-Seiten: Hinweis-Kasten, Spoiler, Tabelle (mit Werkzeugen, solange der Cursor in einer Tabelle steht).
export function BlockTools({ editor }: { editor: Editor }) {
  const [calloutOpen, setCalloutOpen] = useState(false);
  const inTable = editor.isActive("table");
  const inCallout = editor.isActive("callout");
  const inSpoiler = editor.isActive("details");
  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Textbausteine">
      <span className="relative">
        <button
          type="button"
          title="Hinweis-Kasten"
          aria-label="Hinweis-Kasten"
          aria-expanded={calloutOpen}
          onClick={() => setCalloutOpen((v) => !v)}
          className={`${btn} ${inCallout || calloutOpen ? on : idle}`}
        >
          💡 Hinweis
        </button>
        {calloutOpen && (
          <span role="menu" className="absolute left-0 top-full z-20 mt-1 flex min-w-32 flex-col rounded-lg border border-line bg-surface p-1 shadow-lg">
            {CALLOUT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="menuitem"
                onClick={() => {
                  run((c) => c.setCallout(k));
                  setCalloutOpen(false);
                }}
                className="rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-2"
              >
                {KIND_LABEL[k]}
              </button>
            ))}
            {inCallout && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  run((c) => c.unsetCallout());
                  setCalloutOpen(false);
                }}
                className="rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-surface-2 dark:text-red-400"
              >
                Kasten entfernen
              </button>
            )}
          </span>
        )}
      </span>

      <button
        type="button"
        title={inSpoiler ? "Spoiler entfernen" : "Spoiler zum Aufklappen"}
        aria-label={inSpoiler ? "Spoiler entfernen" : "Spoiler zum Aufklappen"}
        onClick={() => run((c) => (inSpoiler ? c.unsetDetails() : c.setDetails()))}
        className={`${btn} ${inSpoiler ? on : idle}`}
      >
        ▸ Spoiler
      </button>

      <button
        type="button"
        title="Tabelle einfügen"
        aria-label="Tabelle einfügen"
        disabled={inTable}
        onClick={() => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}
        className={`${btn} ${idle}`}
      >
        ▦ Tabelle
      </button>

      {inTable && (
        <>
          <span className="mx-1 h-5 w-px bg-line" />
          <button type="button" aria-label="Zeile darunter einfügen" onClick={() => run((c) => c.addRowAfter())} className={`${btn} ${idle}`}>
            + Zeile
          </button>
          <button type="button" aria-label="Spalte rechts einfügen" onClick={() => run((c) => c.addColumnAfter())} className={`${btn} ${idle}`}>
            + Spalte
          </button>
          <button type="button" aria-label="Zeile löschen" onClick={() => run((c) => c.deleteRow())} className={`${btn} ${idle}`}>
            − Zeile
          </button>
          <button type="button" aria-label="Spalte löschen" onClick={() => run((c) => c.deleteColumn())} className={`${btn} ${idle}`}>
            − Spalte
          </button>
          <button type="button" aria-label="Tabelle löschen" onClick={() => run((c) => c.deleteTable())} className={`${btn} text-red-600 hover:bg-surface-2 dark:text-red-400`}>
            Tabelle löschen
          </button>
        </>
      )}
    </div>
  );
}
