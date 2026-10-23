"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { confirmDialog } from "@/components/confirm-dialog";
import { adoptBuiltinTemplate, createNoteFromTemplate, deleteNote } from "../actions";
import { BUILTIN_TEMPLATES } from "@/lib/note-templates";
import { noteSnippet, noteTitle, type NoteView } from "@/lib/notes";
import { useNotebook } from "@/components/notebook-host";

export function TemplatesView({ templates: initial }: { templates: NoteView[] }) {
  const notebook = useNotebook();
  const [templates, setTemplates] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function fromTemplate(input: { templateId?: string; builtinId?: string }) {
    setError(null);
    start(async () => {
      const r = await createNoteFromTemplate(input);
      if (r.error || !r.id) return setError(r.error ?? "Konnte nicht angelegt werden.");
      notebook.open({ noteId: r.id });
    });
  }

  function adopt(builtinId: string) {
    setError(null);
    start(async () => {
      const r = await adoptBuiltinTemplate(builtinId);
      if ("error" in r) return setError(r.error);
      notebook.open({ noteId: r.id });
    });
  }

  async function remove(t: NoteView) {
    if (!(await confirmDialog({ message: `Vorlage „${noteTitle(t)}“ löschen?`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteNote(t.id);
    if (err) return setError(err);
    setTemplates((cur) => cur.filter((x) => x.id !== t.id));
  }

  const btn = "flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-50";
  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section aria-label="Meine Vorlagen">
        <h2 className="mb-2 font-serif text-xl text-fg">Meine Vorlagen</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-muted">Noch keine eigenen Vorlagen.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {templates.map((t) => (
              <RevealRow
                key={t.id}
                className="items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3"
                actions={
                  <button type="button" onClick={() => void remove(t)} title="Vorlage löschen" aria-label="Vorlage löschen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                }
              >
                <Link href={`/notizen/${t.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-fg">{noteTitle(t)}</p>
                  {noteSnippet(t.body, 90) && <p className="truncate text-xs text-fg-soft">{noteSnippet(t.body, 90)}</p>}
                </Link>
                <button type="button" disabled={pending} onClick={() => fromTemplate({ templateId: t.id })} className={btn}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Neue Notiz
                </button>
              </RevealRow>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Vorschläge">
        <h2 className="mb-2 font-serif text-xl text-fg">Vorschläge</h2>
        <ul className="flex flex-col gap-2">
          {BUILTIN_TEMPLATES.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
              <p className="min-w-0 flex-1 basis-full truncate text-[15px] font-semibold text-fg">{t.title}</p>
              <button type="button" disabled={pending} onClick={() => adopt(t.id)} className={btn}>
                Als Vorlage übernehmen
              </button>
              <button type="button" disabled={pending} onClick={() => fromTemplate({ builtinId: t.id })} className={btn}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                Neue Notiz
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
