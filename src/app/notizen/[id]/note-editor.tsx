"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Folder, Globe, Hash, Link2, MoreHorizontal, Pin, PinOff, Trash2, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { NoteLinkChip } from "@/components/note-link-chip";
import { NoteLinkPicker } from "@/components/note-link-picker";
import { confirmDialog } from "@/components/confirm-dialog";
import { addNoteLink, deleteNote, moveNote, removeNoteLink, saveNote, saveNoteAsTemplate, setNoteIsTemplate, setNotePinned, setNoteWorld } from "../actions";
import { stripHtml } from "@/lib/strip-html";
import { MAX_NOTE_TAGS, flattenFolders, normalizeTag, type LinkTarget, type NoteFolder, type NoteLinkView } from "@/lib/notes";

type SaveState = "saved" | "dirty" | "saving" | "error";

// Eine Notiz: Titel und Text speichern von selbst, darunter die Verknüpfungen.
export function NoteEditor({ id, initialTitle, initialBody, initialPinned, initialLinks, initialTags, initialFolderId, initialWorldId, initialIsTemplate, worlds, folders, allTags, backlinks, linkPages, linkCharacters }: { id: string; initialTitle: string; initialBody: string; initialPinned: boolean; initialLinks: NoteLinkView[]; initialTags: string[]; initialFolderId: string | null; initialWorldId: string | null; initialIsTemplate: boolean; worlds: { id: string; name: string }[]; folders: NoteFolder[]; allTags: string[]; backlinks: { id: string; title: string }[]; linkPages: { id: string; title: string }[]; linkCharacters: { id: string; name: string; avatar_url: string | null }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [pinned, setPinned] = useState(initialPinned);
  const [links, setLinks] = useState<NoteLinkView[]>(initialLinks);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMsg, setMenuMsg] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<string | null>(initialWorldId);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const wordCount = (html: string) => stripHtml(html).split(/\s+/).filter(Boolean).length;
  const [words, setWords] = useState(() => wordCount(initialBody));
  const [state, setState] = useState<SaveState>("saved");
  const [picker, setPicker] = useState(false);
  const bodyRef = useRef(initialBody);
  const titleRef = useRef(initialTitle);
  const tagsRef = useRef(initialTags);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    setState("saving");
    const r = await saveNote(id, { title: titleRef.current, body: bodyRef.current, tags: tagsRef.current });
    if ("error" in r) {
      dirty.current = true;
      setState("error");
      return;
    }
    if (r.links) setLinks(r.links);
    // Im Text getippte #Tags erscheinen als Marken
    if (r.tags.join() !== tagsRef.current.join()) {
      tagsRef.current = r.tags;
      setTags(r.tags);
    }
    if (!dirty.current) setState("saved");
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
    setLinks((cur) => (cur.some((l) => l.id === r.link.id) ? cur : [...cur, { ...r.link, avatar: r.link.avatar ?? t.avatar }]));
    return null;
  }

  async function unlink(l: NoteLinkView) {
    setLinks((cur) => cur.filter((x) => x !== l));
    await removeNoteLink(l.id, id);
  }

  function commitTags(next: string[]) {
    tagsRef.current = next;
    setTags(next);
    schedule();
  }

  function addTag(raw: string) {
    const parts = raw.split(/[,\s]+/).map(normalizeTag).filter(Boolean);
    if (parts.length === 0) return setTagInput("");
    commitTags([...new Set([...tags, ...parts])].slice(0, MAX_NOTE_TAGS));
    setTagInput("");
  }

  async function changeFolder(value: string) {
    const next = value || null;
    setFolderId(next);
    await moveNote(id, next);
  }

  async function changeWorld(value: string) {
    const next = value || null;
    setWorldId(next);
    await setNoteWorld(id, next);
    // Wiki-Seiten und Charaktere im Editor gehören zur Welt der Notiz
    router.refresh();
  }

  async function saveAsTemplate() {
    await flush();
    const r = await saveNoteAsTemplate(id);
    setMenuMsg("error" in r ? r.error : "Als Vorlage gespeichert");
  }

  async function toggleTemplate() {
    const next = !isTemplate;
    await flush();
    const err = await setNoteIsTemplate(id, next);
    if (err) return setMenuMsg(err);
    setIsTemplate(next);
    setMenuOpen(false);
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
        {isTemplate && <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">Vorlage</span>}
        <div className="flex items-center gap-1">
          <span className={`mr-2 text-xs ${state === "error" ? "text-red-600" : "text-muted"}`} aria-live="polite">
            {stateLabel}
          </span>
          <button type="button" onClick={togglePin} aria-label={pinned ? "Nicht mehr anheften" : "Anheften"} title={pinned ? "Nicht mehr anheften" : "Anheften"} className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surface-2 ${pinned ? "text-accent" : "text-muted hover:text-fg"}`}>
            {pinned ? <PinOff className="h-4 w-4" strokeWidth={2} /> : <Pin className="h-4 w-4" strokeWidth={2} />}
          </button>
          <div className="relative">
            <button type="button" onClick={() => { setMenuOpen((v) => !v); setMenuMsg(null); }} aria-label="Mehr" aria-expanded={menuOpen} title="Mehr" className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
              <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
                {!isTemplate && (
                  <button type="button" role="menuitem" onClick={() => void saveAsTemplate()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2">
                    <FileText className="h-4 w-4 text-muted" strokeWidth={2} />
                    Als Vorlage speichern
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => void toggleTemplate()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2">
                  <FileText className="h-4 w-4 text-muted" strokeWidth={2} />
                  {isTemplate ? "Zur normalen Notiz machen" : "Selbst zur Vorlage machen"}
                </button>
                {menuMsg && <p className="px-3 py-1.5 text-xs text-muted" role="status">{menuMsg}</p>}
              </div>
            )}
          </div>
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

      <div className="flex flex-wrap items-center gap-2">
        {worlds.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <Globe className="h-3.5 w-3.5" strokeWidth={2} />
            <select value={worldId ?? ""} onChange={(e) => void changeWorld(e.target.value)} aria-label="Welt" className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-fg-soft outline-none focus:border-accent">
              <option value="">Ohne Welt</option>
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {folders.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <Folder className="h-3.5 w-3.5" strokeWidth={2} />
            <select value={folderId ?? ""} onChange={(e) => void changeFolder(e.target.value)} aria-label="Ordner" className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-fg-soft outline-none focus:border-accent">
              <option value="">Ohne Ordner</option>
              {flattenFolders(folders).map((f) => (
                <option key={f.id} value={f.id}>
                  {"– ".repeat(f.depth - 1)}
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 py-0.5 pl-2 pr-1 text-xs text-fg-soft">
            <Hash className="h-3 w-3 text-muted" strokeWidth={2.25} />
            {t}
            <button type="button" onClick={() => commitTags(tags.filter((x) => x !== t))} aria-label={`Tag ${t} entfernen`} className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:text-fg">
              <X className="h-3 w-3" strokeWidth={2.25} />
            </button>
          </span>
        ))}
        {tags.length < MAX_NOTE_TAGS && (
          <>
            <input
              value={tagInput}
              onChange={(e) => {
                const v = e.target.value;
                if (/[,\s]$/.test(v)) addTag(v);
                else setTagInput(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === "Backspace" && !tagInput && tags.length) commitTags(tags.slice(0, -1));
              }}
              onBlur={() => tagInput && addTag(tagInput)}
              list="note-tag-suggestions"
              placeholder="#Tag"
              aria-label="Tag hinzufügen"
              maxLength={31}
              className="w-24 rounded-full border border-dashed border-line bg-transparent px-2.5 py-0.5 text-xs text-fg outline-none placeholder:text-muted focus:border-accent"
            />
            <datalist id="note-tag-suggestions">
              {allTags.filter((t) => !tags.includes(t)).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </>
        )}
      </div>

      <RichTextEditor
        name="body"
        initialContent={initialBody}
        placeholder="Notiz schreiben …"
        minHeight={320}
        allowBlocks
        notesTools
        wikiPages={linkPages}
        wikiCharacters={linkCharacters}
        onChange={(html) => {
          if (html === bodyRef.current) return;
          bodyRef.current = html;
          setWords(wordCount(html));
          schedule();
        }}
      />

      <p className="-mt-2 text-right text-xs tabular-nums text-muted">{words} {words === 1 ? "Wort" : "Wörter"}</p>

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
