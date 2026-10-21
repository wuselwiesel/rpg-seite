"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { CALLOUT_KINDS, type CalloutKind } from "@/lib/callout-kinds";
import { createClient } from "@/lib/supabase/client";
import { MAX_MEDIA_BYTES } from "@/lib/upload-media";
import { UPLOAD_CACHE } from "@/lib/upload-cache";

const KIND_LABEL: Record<CalloutKind, string> = { info: "Info", tipp: "Tipp", achtung: "Achtung", gefahr: "Gefahr" };

const btn = "rounded px-2 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-30";
const idle = "text-fg-soft hover:bg-surface-2 hover:text-fg";
const on = "bg-accent-strong text-on-accent-strong";

// Textbausteine für Wiki-Seiten: Hinweis-Kasten, Spoiler, Tabelle (mit Werkzeugen, solange der Cursor in einer Tabelle steht).
export function BlockTools({ editor }: { editor: Editor }) {
  const [calloutOpen, setCalloutOpen] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const inTable = editor.isActive("table");
  const inCallout = editor.isActive("callout");
  const inSpoiler = editor.isActive("details");
  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();

  async function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setPdfError("Nur PDF-Dateien.");
    if (file.size > MAX_MEDIA_BYTES) return setPdfError("Datei ist zu groß (max. 50 MB).");
    setPdfBusy(true);
    setPdfError(null);
    const supabase = createClient();
    const path = `wiki-pdf/${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, { ...UPLOAD_CACHE, contentType: "application/pdf" });
    setPdfBusy(false);
    if (error) return setPdfError(error.message);
    const url = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    run((c) => c.setPdfFile({ url, name: file.name.slice(0, 120) }));
  }

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

      <button
        type="button"
        title="PDF hochladen"
        aria-label="PDF hochladen"
        disabled={pdfBusy}
        onClick={() => pdfInput.current?.click()}
        className={`${btn} ${idle}`}
      >
        {pdfBusy ? "…" : "📄 PDF"}
      </button>
      <input ref={pdfInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadPdf} />
      {pdfError && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {pdfError}
        </span>
      )}

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
