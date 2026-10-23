"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotebookNav } from "@/app/notizen/notebook-nav";
import { Archive, ArchiveRestore, Check, ChevronLeft, Download, FileCode, FileText, Info, ListTree, Maximize2, Type, Printer, Folder, Globe, Hash, Link2, MoreHorizontal, Pencil, Pin, PinOff, Trash2, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { markdownToHtml, noteToMarkdown } from "@/lib/note-markdown";
import { NoteLinkChip } from "@/components/note-link-chip";
import { NoteLinkPicker } from "@/components/note-link-picker";
import { confirmDialog } from "@/components/confirm-dialog";
import { addNoteLink, archiveNote, deleteNote, moveNote, removeNoteLink, saveNote, saveNoteAsTemplate, setNoteIsTemplate, setNotePinned, setNoteWorld, restoreNote, trashNote } from "@/app/notizen/actions";
import { stripHtml } from "@/lib/strip-html";
import { sanitizePostHtmlCore } from "@/lib/sanitize-core";
import { useEmojiHtml } from "@/components/custom-emoji-provider";
import { linkWikiBrackets } from "@/lib/autolink";
import { emitNotePatch } from "@/lib/note-events";
import { FOCUS_EVENT } from "@/app/notizen/notes-shortcuts";
import { clearDraft, draftDiffers, loadDraft, saveDraft, type NoteDraft } from "@/lib/note-draft";
import { MAX_NOTE_TAGS, flattenFolders, noteOutline, noteStats, normalizeTag, setTaskInHtml, type LinkTarget, type NoteFolder, type NoteLinkView } from "@/lib/notes";

type SaveState = "saved" | "dirty" | "saving" | "error" | "offline";

// Eine Notiz: Titel und Text speichern von selbst, darunter die Verknüpfungen.
export function NoteEditor({ id, initialTitle, initialBody, initialPinned, initialLinks, initialTags, initialFolderId, initialWorldId, initialIsTemplate, initialArchived, initialDeletedAt, createdAt, initialUpdatedAt, worlds, folders, allTags, backlinks, linkPages, linkCharacters }: { id: string; initialTitle: string; initialBody: string; initialPinned: boolean; initialLinks: NoteLinkView[]; initialTags: string[]; initialFolderId: string | null; initialWorldId: string | null; initialIsTemplate: boolean; initialArchived: boolean; initialDeletedAt: string | null; createdAt: string; initialUpdatedAt: string; worlds: { id: string; name: string }[]; folders: NoteFolder[]; allTags: string[]; backlinks: { id: string; title: string }[]; linkPages: { id: string; title: string }[]; linkCharacters: { id: string; name: string; avatar_url: string | null }[] }) {
  const nav = useNotebookNav();
  const [title, setTitle] = useState(initialTitle);
  const [pinned, setPinned] = useState(initialPinned);
  const [links, setLinks] = useState<NoteLinkView[]>(initialLinks);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [archived, setArchived] = useState(initialArchived);
  const [deletedAt, setDeletedAt] = useState<string | null>(initialDeletedAt);
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMsg, setMenuMsg] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<string | null>(initialWorldId);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const wordCount = (html: string) => stripHtml(html).split(/\s+/).filter(Boolean).length;
  // Gespeicherte Notizen erscheinen wie eine fertige Seite; erst „Bearbeiten“ (oder ein Klick in den Text) zeigt den Editor. Leere neue Notizen starten gleich im Editor.
  const [editing, setEditing] = useState(() => !initialTitle.trim() && !stripHtml(initialBody).trim());
  // Markdown-Quelltext statt Editor: der Text wird beim Umschalten hin- und zurückgewandelt
  const [source, setSource] = useState(false);
  const [md, setMd] = useState("");
  const [bodyInit, setBodyInit] = useState(initialBody);
  const [editorKey, setEditorKey] = useState(0);
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  // Darstellung (nur in diesem Browser): Schrift, Größe, Papier
  const [look, setLook] = useState({ font: "serif", size: "m", paper: "standard" });
  const lookRef = useRef(look);
  const [lookOpen, setLookOpen] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("notes-look") ?? "null");
      if (raw && typeof raw === "object") {
        lookRef.current = { ...lookRef.current, ...raw };
        setLook(lookRef.current);
      }
    } catch {
      /* Standard */
    }
  }, []);
  function changeLook(patch: Partial<typeof look>) {
    const next = { ...lookRef.current, ...patch };
    lookRef.current = next;
    setLook(next);
    try {
      localStorage.setItem("notes-look", JSON.stringify(next));
    } catch {
      /* nicht merken */
    }
  }
  const [panel, setPanel] = useState<"outline" | "info" | null>(null);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
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
    // Ohne Netz gar nicht erst versuchen: der Entwurf liegt im Browser, gespeichert wird später
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
      return;
    }
    dirty.current = false;
    setState("saving");
    let r: Awaited<ReturnType<typeof saveNote>>;
    try {
      r = await saveNote(id, { title: titleRef.current, body: bodyRef.current, tags: tagsRef.current });
    } catch {
      dirty.current = true;
      setState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      return;
    }
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
    emitNotePatch({ id, title: titleRef.current, body: bodyRef.current, tags: r.tags, ...(r.links ? { links: r.links } : {}) });
    setUpdatedAt(new Date().toISOString());
    if (!dirty.current) {
      setState("saved");
      clearDraft(id);
    }
  }, [id]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setState("dirty");
    saveDraft(id, { title: titleRef.current, body: bodyRef.current, tags: tagsRef.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  }, [flush, id]);

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

  // Scheiterte das Speichern (kein Netz, Fehler), erneut versuchen: sobald das Netz zurück ist und alle 15 Sekunden
  useEffect(() => {
    const retry = () => {
      if (dirty.current) void flush();
    };
    window.addEventListener("online", retry);
    const t = window.setInterval(retry, 15000);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(t);
    };
  }, [flush]);

  // Entwurf aus dem Browser, der neuer ist als der gespeicherte Stand (z. B. nach Absturz oder ohne Netz geschlossen)
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  useEffect(() => {
    const d = loadDraft(id);
    if (d && draftDiffers(d, { title: initialTitle, body: initialBody, tags: initialTags, updatedAt: initialUpdatedAt })) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(d);
    } else if (d) clearDraft(id);
    // nur beim Öffnen prüfen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function restoreDraft() {
    if (!draft) return;
    titleRef.current = draft.title;
    setTitle(draft.title);
    tagsRef.current = draft.tags;
    setTags(draft.tags);
    bodyRef.current = draft.body;
    setBodyInit(draft.body);
    setBodyHtml(draft.body);
    setWords(wordCount(draft.body));
    setEditorKey((k) => k + 1);
    setDraft(null);
    schedule();
  }

  function discardDraft() {
    clearDraft(id);
    setDraft(null);
  }

  async function pick(t: LinkTarget): Promise<string | null> {
    const r = await addNoteLink(id, t.kind, t.id);
    if ("error" in r) return r.error;
    const next = links.some((l) => l.id === r.link.id) ? links : [...links, { ...r.link, avatar: r.link.avatar ?? t.avatar }];
    setLinks(next);
    emitNotePatch({ id, links: next });
    return null;
  }

  async function unlink(l: NoteLinkView) {
    const next = links.filter((x) => x !== l);
    setLinks(next);
    emitNotePatch({ id, links: next });
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
    emitNotePatch({ id, folderId: next });
    await moveNote(id, next);
  }

  async function changeWorld(value: string) {
    const next = value || null;
    setWorldId(next);
    emitNotePatch({ id, worldId: next });
    await setNoteWorld(id, next);
    // Wiki-Seiten und Charaktere im Editor gehören zur Welt der Notiz
    nav.reload();
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
    nav.reload();
  }

  function toggleSource() {
    if (!source) {
      setMd(noteToMarkdown(bodyRef.current));
      setSource(true);
      return;
    }
    const html = markdownToHtml(md);
    bodyRef.current = html;
    setBodyInit(html);
    setEditorKey((k) => k + 1);
    setWords(wordCount(html));
            setBodyHtml(html);
    setSource(false);
    schedule();
  }

  function startEditing() {
    if (deletedAt) return;
    setBodyInit(bodyRef.current);
    setEditorKey((k) => k + 1);
    setEditing(true);
  }

  async function finishEditing() {
    if (source) {
      const html = markdownToHtml(md);
      bodyRef.current = html;
      setBodyHtml(html);
      setSource(false);
    }
    await flush();
    setEditing(false);
  }

  // Fertige Seite: Kästchen lassen sich direkt abhaken, ein Klick in den Text öffnet den Editor
  // :emoji: werden zu Bildern, [[Seiten]] und Figurennamen in [[ ]] zu Links (wie in Beiträgen und im Wiki)
  const wikiTerms = useMemo(() => linkPages.map((p) => ({ id: p.id, title: p.title, category: "Wiki", excerpt: "" })), [linkPages]);
  const charTerms = useMemo(() => linkCharacters.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatar_url, excerpt: "" })), [linkCharacters]);
  const linkedHtml = useMemo(() => linkWikiBrackets(sanitizePostHtmlCore(bodyHtml), wikiTerms, charTerms), [bodyHtml, wikiTerms, charTerms]);
  const viewHtml = useEmojiHtml(linkedHtml);
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    viewRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((i) => (i.disabled = false));
  }, [viewHtml, editing]);

  function onViewClick(e: React.MouseEvent<HTMLDivElement>) {
    const t = e.target as HTMLElement;
    const box = t.closest<HTMLInputElement>('input[type="checkbox"]');
    if (box) {
      e.preventDefault();
      const items = [...e.currentTarget.querySelectorAll('li[data-type="taskItem"]')];
      const li = box.closest('li[data-type="taskItem"]');
      const index = li ? items.indexOf(li) : -1;
      if (index < 0 || !li) return;
      const next = setTaskInHtml(bodyRef.current, index, li.getAttribute("data-checked") !== "true");
      if (next === null) return;
      bodyRef.current = next;
      setBodyHtml(next);
      schedule();
      return;
    }
    if (t.closest("a, button, summary") || window.getSelection()?.toString()) return;
    startEditing();
  }

  async function togglePin() {
    const next = !pinned;
    setPinned(next);
    emitNotePatch({ id, pinned: next });
    await setNotePinned(id, next);
  }

  // In den Papierkorb (30 Tage, wiederherstellbar); endgültig löschen gibt es nur dort
  async function remove() {
    await flush();
    const err = await trashNote(id);
    if (err) return setMenuMsg(err);
    emitNotePatch({ id, deletedAt: new Date().toISOString() });
    nav.closeNote();
    nav.reload();
  }

  async function restore() {
    const err = await restoreNote(id);
    if (err) return setMenuMsg(err);
    setDeletedAt(null);
    emitNotePatch({ id, deletedAt: null });
    nav.reload();
  }

  async function removeForever() {
    if (!(await confirmDialog({ message: "Notiz endgültig löschen?", confirmLabel: "Löschen", danger: true }))) return;
    dirty.current = false;
    if (timer.current) clearTimeout(timer.current);
    await deleteNote(id);
    nav.closeNote();
    nav.reload();
  }

  async function toggleArchive() {
    const next = !archived;
    const err = await archiveNote(id, next);
    if (err) return setMenuMsg(err);
    setArchived(next);
    setMenuOpen(false);
    emitNotePatch({ id, archived: next });
  }

  const taken = new Set(links.map((l) => `${l.kind}:${l.targetId}`));
  const stateLabel = { saved: "Gespeichert", dirty: "Ungespeichert …", saving: "Speichert …", error: "Speichern fehlgeschlagen", offline: "Offline – wird gespeichert, sobald du wieder online bist" }[state];

  return (
    <div data-font={look.font} data-size={look.size} data-paper={look.paper} className="note-surface mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <button type="button" onClick={() => nav.closeNote()} className="flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg lg:invisible">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Notizen
        </button>
        {isTemplate && <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">Vorlage</span>}
        <div className="flex flex-wrap items-center justify-end gap-1">
          {editing ? (
            <button type="button" onClick={() => void finishEditing()} className="mr-1 flex items-center gap-1 rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90">
              <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
              Fertig
            </button>
          ) : (
            !deletedAt && (
              <button type="button" onClick={startEditing} className="mr-1 flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Bearbeiten
              </button>
            )
          )}
          {(editing || state === "error" || state === "offline") && (
            <span className={`mr-2 max-w-[14rem] text-right text-xs ${state === "error" ? "text-red-600" : "text-muted"}`} aria-live="polite">
              {stateLabel}
            </span>
          )}
          {editing && (
          <div className="relative">
            <button type="button" onClick={() => setLookOpen((v) => !v)} aria-expanded={lookOpen} aria-label="Darstellung" title="Darstellung" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
              <Type className="h-4 w-4" strokeWidth={2} />
            </button>
            {lookOpen && (
              <div role="dialog" aria-label="Darstellung" className="absolute right-0 top-full z-30 mt-1 w-64 rounded-2xl border border-line bg-surface p-3 shadow-lg">
                {(
                  [
                    ["font", "Schrift", [["serif", "Serif"], ["sans", "Sans"], ["mono", "Mono"], ["lora", "Buchschrift"], ["playfair", "Elegant"], ["ebGaramond", "Zeitlos"], ["caveat", "Handschrift"], ["handlee", "Notizbuch"], ["specialElite", "Schreibmaschine"]]],
                    ["size", "Größe", [["s", "Klein"], ["m", "Normal"], ["l", "Groß"], ["xl", "Sehr groß"]]],
                    ["paper", "Papier", [["standard", "Standard"], ["sepia", "Sepia"], ["dark", "Dunkel"]]],
                  ] as [keyof typeof look, string, [string, string][]][]
                ).map(([k, label, opts]) => (
                  <div key={k} className="mb-2 last:mb-0">
                    <p className="mb-1 text-xs text-muted">{label}</p>
                    <div className="flex flex-wrap gap-1">
                      {opts.map(([v, text]) => (
                        <button key={v} type="button" onClick={() => changeLook({ [k]: v })} aria-pressed={look[k] === v} className={`rounded-full px-2.5 py-1 text-xs transition ${look[k] === v ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}>
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
          <button type="button" onClick={() => window.dispatchEvent(new Event(FOCUS_EVENT))} aria-label="Fokus-Modus" title="Fokus-Modus (Alt+F)" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <Maximize2 className="h-4 w-4" strokeWidth={2} />
          </button>
          {editing && (
          <button type="button" onClick={toggleSource} aria-pressed={source} aria-label="Markdown-Quelltext" title="Markdown-Quelltext" className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${source ? "text-accent" : "text-muted hover:text-fg"}`}>
            <FileCode className="h-4 w-4" strokeWidth={2} />
          </button>
          )}
          <button type="button" onClick={togglePin} aria-label={pinned ? "Nicht mehr anheften" : "Anheften"} title={pinned ? "Nicht mehr anheften" : "Anheften"} className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${pinned ? "text-accent" : "text-muted hover:text-fg"}`}>
            {pinned ? <PinOff className="h-4 w-4" strokeWidth={2} /> : <Pin className="h-4 w-4" strokeWidth={2} />}
          </button>
          <div className="relative">
            <button type="button" onClick={() => { setMenuOpen((v) => !v); setMenuMsg(null); }} aria-label="Mehr" aria-expanded={menuOpen} title="Mehr" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
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
                <button type="button" role="menuitem" onClick={() => void toggleArchive()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2">
                  {archived ? <ArchiveRestore className="h-4 w-4 text-muted" strokeWidth={2} /> : <Archive className="h-4 w-4 text-muted" strokeWidth={2} />}
                  {archived ? "Aus dem Archiv holen" : "Archivieren"}
                </button>
                <a href={`/notizen/druck?id=${id}`} target="_blank" rel="noreferrer" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2">
                  <Printer className="h-4 w-4 text-muted" strokeWidth={2} />
                  Als PDF
                </a>
                <a href={`/notizen/export?id=${id}`} download role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2">
                  <Download className="h-4 w-4 text-muted" strokeWidth={2} />
                  Als Text (Markdown)
                </a>
                {menuMsg && <p className="px-3 py-1.5 text-xs text-muted" role="status">{menuMsg}</p>}
              </div>
            )}
          </div>
          {!deletedAt && (
            <button type="button" onClick={() => void remove()} aria-label="In den Papierkorb" title="In den Papierkorb" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {deletedAt && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-fg">
          <span className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted" strokeWidth={2} />
            Im Papierkorb
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={() => void restore()} className="rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong hover:opacity-90">
              Wiederherstellen
            </button>
            <button type="button" onClick={() => void removeForever()} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-red-600 hover:bg-surface">
              Endgültig löschen
            </button>
          </span>
        </div>
      )}

      {draft && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-fg">
          <span>Ungespeicherte Änderungen vom {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(draft.at))}</span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={restoreDraft} className="rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong hover:opacity-90">
              Wiederherstellen
            </button>
            <button type="button" onClick={discardDraft} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft hover:bg-surface">
              Verwerfen
            </button>
          </span>
        </div>
      )}

      {editing ? (
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
      ) : (
        <h2 className="font-serif text-3xl text-fg [overflow-wrap:anywhere]">{title.trim() || <span className="text-muted/60">Ohne Titel</span>}</h2>
      )}

      {(editing || links.length > 0) && (
      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <NoteLinkChip key={l.id} link={l}>
            {editing && (
              <button type="button" onClick={() => void unlink(l)} aria-label={`${l.label} entfernen`} className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-fg">
                <X className="h-3 w-3" strokeWidth={2.25} />
              </button>
            )}
          </NoteLinkChip>
        ))}
        {editing && (
          <button type="button" onClick={() => setPicker(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
            <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
            Verknüpfen
          </button>
        )}
      </div>
      )}

      {!editing && (worldId || folderId || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {worldId && (
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" strokeWidth={2} />
              {worlds.find((w) => w.id === worldId)?.name}
            </span>
          )}
          {folderId && (
            <span className="inline-flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" strokeWidth={2} />
              {folders.find((f) => f.id === folderId)?.name}
            </span>
          )}
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-fg-soft">
              <Hash className="h-3 w-3 text-muted" strokeWidth={2.25} />
              {t}
            </span>
          ))}
        </div>
      )}

      {editing && (
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
      )}

      {!editing ? (
        <div
          ref={viewRef}
          onClick={onViewClick}
          dangerouslySetInnerHTML={{ __html: viewHtml }}
          className={`post-content note-view min-h-[8rem] text-fg [overflow-wrap:anywhere] ${deletedAt ? "" : "cursor-text"}`}
        />
      ) : source ? (
        <textarea
          value={md}
          onChange={(e) => {
            setMd(e.target.value);
            bodyRef.current = markdownToHtml(e.target.value);
            setWords(wordCount(bodyRef.current));
            setBodyHtml(bodyRef.current);
            schedule();
          }}
          aria-label="Markdown"
          spellCheck={false}
          className="min-h-[20rem] w-full resize-y rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm leading-relaxed text-fg outline-none focus:border-accent"
        />
      ) : (
        <RichTextEditor
          key={editorKey}
          name="body"
          initialContent={bodyInit}
          placeholder="Notiz schreiben …"
          minHeight={320}
          allowBlocks
          notesTools
          allowFontSelection
          wikiPages={linkPages}
          wikiCharacters={linkCharacters}
          onChange={(html) => {
            if (html === bodyRef.current) return;
            bodyRef.current = html;
            setWords(wordCount(html));
            setBodyHtml(html);
            schedule();
          }}
        />
      )}

      <div className="relative -mt-2 flex items-center justify-end gap-1 text-xs text-muted">
        <button type="button" onClick={() => setPanel(panel === "outline" ? null : "outline")} aria-expanded={panel === "outline"} className="flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-surface-2 hover:text-fg">
          <ListTree className="h-3.5 w-3.5" strokeWidth={2} />
          Gliederung
        </button>
        <button type="button" onClick={() => setPanel(panel === "info" ? null : "info")} aria-expanded={panel === "info"} className="flex items-center gap-1 rounded-full px-2 py-1 tabular-nums transition hover:bg-surface-2 hover:text-fg">
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
          {words} {words === 1 ? "Wort" : "Wörter"}
        </button>
        {panel === "outline" && (
          <div role="dialog" aria-label="Gliederung" className="absolute bottom-full right-0 z-20 mb-1 max-h-72 w-72 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-lg">
            {noteOutline(bodyHtml).length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">Keine Überschriften.</p>
            ) : (
              <ul>
                {noteOutline(bodyHtml).map((h) => (
                  <li key={h.index}>
                    <button
                      type="button"
                      onClick={() => {
                        const els = [...document.querySelectorAll(".ProseMirror, .note-view")].find((e) => (e as HTMLElement).offsetParent !== null)?.querySelectorAll("h1, h2, h3");
                        els?.[h.index]?.scrollIntoView({ behavior: "smooth", block: "start" });
                        setPanel(null);
                      }}
                      style={{ paddingLeft: `${(h.level - 1) * 0.9 + 0.5}rem` }}
                      className={`block w-full truncate rounded-lg py-1.5 pr-2 text-left text-sm text-fg hover:bg-surface-2 ${h.level === 1 ? "font-semibold" : ""}`}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {panel === "info" && (() => {
          const st = noteStats(bodyHtml);
          const when = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
          const rows: [string, string][] = [
            ["Wörter", String(st.words)],
            ["Zeichen", String(st.characters)],
            ["Ohne Leerzeichen", String(st.charactersNoSpaces)],
            ["Absätze", String(st.paragraphs)],
            ["Lesezeit", st.readingMinutes === 0 ? "–" : `${st.readingMinutes} Min.`],
            ["Erstellt", when.format(new Date(createdAt))],
            ["Zuletzt geändert", when.format(new Date(updatedAt))],
          ];
          return (
            <dl role="dialog" aria-label="Notiz-Info" className="absolute bottom-full right-0 z-20 mb-1 w-64 rounded-2xl border border-line bg-surface p-3 text-sm shadow-lg">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 py-0.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="tabular-nums text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          );
        })()}
      </div>

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
