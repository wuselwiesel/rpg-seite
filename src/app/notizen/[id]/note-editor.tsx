"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Link2, Pin, PinOff, Trash2, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { NoteLinkChip } from "@/components/note-link-chip";
import { NoteLinkPicker } from "@/components/note-link-picker";
import { confirmDialog } from "@/components/confirm-dialog";
import { addNoteLink, deleteNote, removeNoteLink, saveNote, setNotePinned } from "../actions";
import type { LinkTarget, NoteLinkView } from "@/lib/notes";

type SaveState = "saved" | "dirty" | "saving" | "error";

// Eine Notiz: Titel und Text speichern von selbst, darunter die Verknüpfungen.
export function NoteEditor({ id, initialTitle, initialBody, initialPinned, initialLinks, backlinks }: { id: string; initialTitle: string; initialBody: string; initialPinned: boolean; initialLinks: NoteLinkView[]; backlinks: { id: string; title: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [pinned, setPinned] = useState(initialPinned);
  const [links, setLinks] = useState<NoteLinkView[]>(initialLinks);
  const [state, setState] = useState<SaveState>("saved");
  const [picker, setPicker] = useState(false);
  const bodyRef = useRef(initialBody);
  const titleRef = useRef(initialTitle);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    setState("saving");
    const err = await saveNote(id, { title: titleRef.current, body: bodyRef.current });
    if (err) {
      dirty.current = true;
      setState("error");
    } else if (!dirty.current) setState("saved");
  }, [id]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  }, [flush]);

  // Beim Verlassen der Seite (oder des Tabs) noch Ungespeichertes wegschreiben
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  async function pick(t: LinkTarget): Promise<string | null> {
    const r = await addNoteLink(id, t.kind, t.id);
    if ("error" in r) return r.error;
    const href = t.kind === "character" ? `/characters/${t.id}` : t.kind === "wiki" ? `/wiki/${t.id}` : t.kind === "scene" ? `/story/${t.id}` : t.kind === "note" ? `/notizen/${t.id}` : null;
    setLinks((cur) => (cur.some((l) => l.id === r.id) ? cur : [...cur, { id: r.id, kind: t.kind, targetId: t.id, label: t.label, href, avatar: t.avatar }]));
    return null;
  }

  async function unlink(l: NoteLinkView) {
    setLinks((cur) => cur.filter((x) => x !== l));
    await removeNoteLink(l.id, id);
  }

  async function togglePin() {
    const next = !pinned;
    setPinned(next);
    await setNotePinned(id, next);
  }

  async function remove() {
    if (!(await confirmDialog({ message: "Notiz löschen?", confirmLabel: "Löschen", danger: true }))) return;
    dirty.current = false;
    if (timer.current) clearTimeout(timer.current);
    await deleteNote(id);
    router.replace("/notizen");
  }

  const taken = new Set(links.map((l) => `${l.kind}:${l.targetId}`));
  const stateLabel = { saved: "Gespeichert", dirty: "Ungespeichert …", saving: "Speichert …", error: "Speichern fehlgeschlagen" }[state];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/notizen" className="flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Notizen
        </Link>
        <div className="flex items-center gap-1">
          <span className={`mr-2 text-xs ${state === "error" ? "text-red-600" : "text-muted"}`} aria-live="polite">
            {stateLabel}
          </span>
          <button type="button" onClick={togglePin} aria-label={pinned ? "Nicht mehr anheften" : "Anheften"} title={pinned ? "Nicht mehr anheften" : "Anheften"} className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surface-2 ${pinned ? "text-accent" : "text-muted hover:text-fg"}`}>
            {pinned ? <PinOff className="h-4 w-4" strokeWidth={2} /> : <Pin className="h-4 w-4" strokeWidth={2} />}
          </button>
          <button type="button" onClick={remove} aria-label="Notiz löschen" title="Notiz löschen" className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          titleRef.current = e.target.value;
          schedule();
        }}
        maxLength={200}
        placeholder="Titel"
        aria-label="Titel"
        className="w-full bg-transparent font-serif text-3xl text-fg outline-none placeholder:text-muted/60"
      />

      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <NoteLinkChip key={l.id} link={l}>
            <button type="button" onClick={() => void unlink(l)} aria-label={`${l.label} entfernen`} className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-fg">
              <X className="h-3 w-3" strokeWidth={2.25} />
            </button>
          </NoteLinkChip>
        ))}
        <button type="button" onClick={() => setPicker(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
          <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
          Verknüpfen
        </button>
      </div>

      <RichTextEditor
        name="body"
        initialContent={initialBody}
        placeholder="Notiz schreiben …"
        minHeight={320}
        onChange={(html) => {
          if (html === bodyRef.current) return;
          bodyRef.current = html;
          schedule();
        }}
      />

      {backlinks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs text-muted">Verlinkt in</span>
          {backlinks.map((b) => (
            <NoteLinkChip key={b.id} link={{ kind: "note", label: b.title, href: `/notizen/${b.id}` }} />
          ))}
        </div>
      )}

      {picker && <NoteLinkPicker noteId={id} taken={taken} onPick={pick} onClose={() => setPicker(false)} />}
    </div>
  );
}
