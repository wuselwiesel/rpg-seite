"use client";

import { createPortal } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BookOpen, Bookmark, Check, Copy, NotebookPen, Quote, X } from "lucide-react";
import { copyEntries } from "@/lib/entry-copy";
import { createClient } from "@/lib/supabase/client";
import { defaultClipTitle } from "@/lib/clips";
import { MAX_CLIP_ENTRIES_CLIENT } from "@/lib/clip-limits";
import { requestQuote, visibleEntryElement, visibleEntryIds } from "@/lib/scene-quote";
import { previewSceneQuote, saveSceneClip } from "@/app/story/clip-actions";
import { createNoteFromScene } from "@/app/notizen/actions";

type Ctx = {
  picking: boolean;
  isSelected: (entryId: string) => boolean;
  // Erste Nachricht wählen bzw. (bei laufender Auswahl) bis zu dieser Nachricht erweitern
  pick: (entryId: string) => void;
};

const ClipSelectionContext = createContext<Ctx | null>(null);

// Außerhalb einer Szene (oder ohne Auswahl-Rahmen) ist das null
export function useClipSelection() {
  return useContext(ClipSelectionContext);
}

const DEFAULT_COLLECTIONS = ["Wichtige Momente", "Erinnerungen", "Geschehnisse"];
const field = "rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";

export function ClipSelectionProvider({
  storyPostId,
  sceneTitle,
  ownCharacters,
  activeCharacterId,
  canQuote,
  children,
}: {
  storyPostId: string;
  sceneTitle: string;
  ownCharacters: { id: string; name: string }[];
  activeCharacterId: string | null;
  // Zitieren geht nur, wo der Szenen-Chat offen ist (nicht in abgeschlossenen Szenen)
  canQuote: boolean;
  children: React.ReactNode;
}) {
  const [anchor, setAnchor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // Markierte Textstellen (statt ganzer Nachrichten), die gespeichert werden sollen
  const [excerptSave, setExcerptSave] = useState<Record<string, string> | null>(null);

  const cancel = useCallback(() => {
    setExcerptSave(null);
    setAnchor(null);
    setSelected([]);
    setDialog(false);
    setQuoteError(null);
  }, []);

  const pick = useCallback(
    (id: string) => {
      setQuoteError(null);
      if (!anchor) {
        setAnchor(id);
        setSelected([id]);
        return;
      }
      if (id === anchor && selected.length === 1) return cancel();
      const order = visibleEntryIds();
      const a = order.indexOf(anchor);
      const b = order.indexOf(id);
      if (a < 0 || b < 0) {
        setAnchor(id);
        setSelected([id]);
        return;
      }
      const [lo, hi] = a < b ? [a, b] : [b, a];
      setSelected(order.slice(lo, Math.min(hi + 1, lo + MAX_CLIP_ENTRIES_CLIENT)));
    },
    [anchor, selected.length, cancel],
  );

  useEffect(() => {
    if (!anchor || dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [anchor, dialog, cancel]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const value = useMemo<Ctx>(() => ({ picking: !!anchor, isSelected: (id) => selected.includes(id), pick }), [anchor, selected, pick]);

  async function toNote(entryIds: string[], excerpts?: Record<string, string>): Promise<string | null> {
    const r = await createNoteFromScene({ storyPostId, entryIds, excerpts });
    return r.error ?? null;
  }

  async function quote() {
    setSaving(true);
    setQuoteError(null);
    const draft = await previewSceneQuote({ storyPostId, entryIds: selected });
    setSaving(false);
    if ("error" in draft) return setQuoteError(draft.error);
    requestQuote(draft);
    cancel();
    setToast("Zitat liegt im Chat bereit. Dort abschicken.");
  }

  return (
    <ClipSelectionContext.Provider value={value}>
      {children}
      {!anchor && !dialog && (
        <SelectionActions
          storyPostId={storyPostId}
          canQuote={canQuote}
          onQuoted={() => setToast("Zitat liegt im Chat bereit. Dort abschicken.")}
          onNote={async (excerpts) => {
            const err = await toNote(Object.keys(excerpts), excerpts);
            if (!err) setToast("Als Notiz gespeichert");
            return err;
          }}
          onSave={(excerpts) => {
            setExcerptSave(excerpts);
            setDialog(true);
          }}
        />
      )}
      {/* Per Portal an <body>: Der Seitenrahmen bildet einen eigenen Stapel, darin läge alles unter der Kopfzeile */}
      {(anchor || toast || dialog) &&
        createPortal(
          <>
      {anchor && !dialog && (
        <div
          role="toolbar"
          aria-label="Auswahl"
          className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm flex-col gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-lg lg:bottom-6"
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{selected.length === 1 ? "1 Nachricht gewählt" : `${selected.length} Nachrichten gewählt`}</span>
            {quoteError && <span className="truncate text-xs text-red-600 dark:text-red-400">{quoteError}</span>}
            <button type="button" onClick={cancel} title="Abbrechen" aria-label="Abbrechen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void copyEntries(selected, true).then((ok) => {
                  if (!ok) return setQuoteError("Kopieren hat nicht geklappt.");
                  cancel();
                  setToast(selected.length === 1 ? "Nachricht kopiert" : `${selected.length} Nachrichten kopiert`);
                })
              }
              title="Kopieren"
              aria-label="Kopieren"
              className="flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              Kopieren
            </button>
            {canQuote && (
              <button
                type="button"
                onClick={() => void quote()}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
              >
                <Quote className="h-3.5 w-3.5" strokeWidth={2} />
                Im Chat zitieren
              </button>
            )}
            <button
              type="button"
              title="Als Notiz speichern"
              aria-label="Als Notiz speichern"
              onClick={() =>
                void toNote(selected).then((err) => {
                  if (err) return setQuoteError(err);
                  cancel();
                  setToast("Als Notiz gespeichert");
                })
              }
              className="flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
              Notiz
            </button>
            <button
              type="button"
              onClick={() => setDialog(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
            >
              <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
              Speichern
            </button>
          </div>
        </div>
      )}
      {dialog && (
        <SaveClipDialog
          storyPostId={storyPostId}
          sceneTitle={sceneTitle}
          entryIds={excerptSave ? Object.keys(excerptSave) : selected}
          excerpts={excerptSave ?? undefined}
          characters={ownCharacters}
          activeCharacterId={activeCharacterId}
          onClose={() => setDialog(false)}
          onSaved={(count, wikiNote) => {
            cancel();
            setToast(wikiNote ?? (count > 1 ? `Gespeichert bei ${count} Charakteren` : "Gespeichert"));
          }}
        />
      )}
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong shadow-lg lg:bottom-6">
          <Check className="h-4 w-4" strokeWidth={2} />
          {toast}
        </div>
      )}
          </>,
          document.body,
        )}
    </ClipSelectionContext.Provider>
  );
}

function SaveClipDialog({
  storyPostId,
  sceneTitle,
  entryIds,
  excerpts,
  characters,
  activeCharacterId,
  onClose,
  onSaved,
}: {
  storyPostId: string;
  sceneTitle: string;
  entryIds: string[];
  excerpts?: Record<string, string>;
  characters: { id: string; name: string }[];
  activeCharacterId: string | null;
  onClose: () => void;
  onSaved: (characterCount: number, message?: string) => void;
}) {
  const [title, setTitle] = useState(() => {
    const first = (excerpts ? excerpts[entryIds[0]] : visibleEntryElement(entryIds[0])?.querySelector(".post-content")?.textContent) ?? "";
    return defaultClipTitle([{ html: first }], sceneTitle);
  });
  const [note, setNote] = useState("");
  const [chosen, setChosen] = useState<string[]>(() => {
    const fallback = characters.find((c) => c.id === activeCharacterId) ?? characters[0];
    return fallback ? [fallback.id] : [];
  });
  const [collection, setCollection] = useState(DEFAULT_COLLECTIONS[0]);
  const [existing, setExisting] = useState<string[]>([]);
  const [wiki, setWiki] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (chosen.length === 0) return;
    let cancelled = false;
    createClient()
      .from("clip_collections")
      .select("name")
      .in("character_id", chosen)
      .then(({ data }) => {
        if (!cancelled) setExisting(Array.from(new Set((data ?? []).map((r) => r.name as string))));
      });
    return () => {
      cancelled = true;
    };
  }, [chosen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const suggestions = Array.from(new Set([...existing, ...DEFAULT_COLLECTIONS]));

  async function save() {
    setPending(true);
    setError(null);
    let result: Awaited<ReturnType<typeof saveSceneClip>>;
    try {
      result = await saveSceneClip({ storyPostId, entryIds, title, note, characterIds: chosen, collectionName: collection, publishToWiki: wiki, excerpts });
    } catch {
      setPending(false);
      return setError("Speichern hat nicht geklappt. Bitte noch einmal versuchen.");
    }
    setPending(false);
    if ("error" in result) return setError(result.error);
    onSaved(chosen.length, result.wikiError ? `Gespeichert, aber nicht im Wiki: ${result.wikiError}` : wiki ? "Gespeichert und im Wiki für alle" : undefined);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Ausschnitt speichern">
      <button type="button" aria-label="Schließen" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative flex max-h-[90dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-2xl bg-app p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl">
        <h2 className="font-serif text-xl text-fg">{excerpts ? "Textstelle speichern" : entryIds.length === 1 ? "Nachricht speichern" : `${entryIds.length} Nachrichten speichern`}</h2>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Titel
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Notiz
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className={`${field} resize-y`} />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm text-fg-soft">Für</legend>
          <div className="flex flex-wrap gap-1.5">
            {characters.map((c) => {
              const on = chosen.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChosen((prev) => (on ? prev.filter((id) => id !== c.id) : [...prev, c.id]))}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clip-collection" className="text-sm text-fg-soft">
            Sammlung
          </label>
          <input id="clip-collection" value={collection} onChange={(e) => setCollection(e.target.value)} maxLength={60} className={field} />
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCollection(name)}
                className={`rounded-full px-2.5 py-1 text-xs transition ${collection.toLowerCase() === name.toLowerCase() ? "bg-surface-2 text-fg ring-1 ring-accent" : "bg-surface-2 text-muted hover:text-fg"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-pressed={wiki}
          onClick={() => setWiki((v) => !v)}
          className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${wiki ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
          Im Wiki für alle zeigen
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted transition hover:text-fg">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={pending || chosen.length === 0 || !title.trim() || !collection.trim()}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:bg-surface-2 disabled:text-muted disabled:opacity-100"
          >
            {pending ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

type TextSelection = { excerpts: Record<string, string>; rect: { top: number; bottom: number; left: number; width: number } };

// Markierter Text innerhalb der Nachrichten der Szene: je Nachricht nur der markierte Teil
function readTextSelection(): TextSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const host = node.nodeType === 1 ? (node as Element) : node.parentElement;
  if (!host || host.closest('[contenteditable="true"], input, textarea, select')) return null;
  const list = Array.from(document.querySelectorAll<HTMLElement>("#beitragsliste")).find((el) => el.offsetParent !== null);
  if (!list || !list.contains(host)) return null;
  const excerpts: Record<string, string> = {};
  for (const entry of list.querySelectorAll<HTMLElement>('[id^="beitrag-"]')) {
    if (!range.intersectsNode(entry) || entry.offsetParent === null) continue;
    const id = entry.id.slice("beitrag-".length);
    if (!/^[0-9a-f-]{36}$/i.test(id)) continue;
    const parts: string[] = [];
    for (const content of entry.querySelectorAll<HTMLElement>(".post-content")) {
      if (!range.intersectsNode(content)) continue;
      const r = document.createRange();
      r.selectNodeContents(content);
      if (range.compareBoundaryPoints(Range.START_TO_START, r) > 0) r.setStart(range.startContainer, range.startOffset);
      if (range.compareBoundaryPoints(Range.END_TO_END, r) < 0) r.setEnd(range.endContainer, range.endOffset);
      const text = r.toString().trim();
      if (text) parts.push(text);
    }
    const text = parts.join("\n").trim();
    if (text.length >= 2) excerpts[id] = text.slice(0, 1500);
  }
  const ids = Object.keys(excerpts);
  if (ids.length === 0 || ids.length > 6) return null;
  const rect = range.getBoundingClientRect();
  return { excerpts, rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width } };
}

// Schwebende Knöpfe an markiertem Text einer Nachricht: im Chat zitieren oder als Ausschnitt in den Charakterbogen speichern
function SelectionActions({
  storyPostId,
  canQuote,
  onQuoted,
  onNote,
  onSave,
}: {
  storyPostId: string;
  canQuote: boolean;
  onQuoted: () => void;
  onNote: (excerpts: Record<string, string>) => Promise<string | null>;
  onSave: (excerpts: Record<string, string>) => void;
}) {
  const [sel, setSel] = useState<TextSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const update = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setSel(readTextSelection());
        setError(null);
      }, 160);
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!sel || typeof document === "undefined") return null;
  // Am Handy erscheint über der Markierung das Menü des Systems: die Knöpfe stehen darunter
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const width = canQuote ? 290 : 190;
  const left = Math.min(Math.max(8, sel.rect.left + sel.rect.width / 2 - width / 2), window.innerWidth - width - 8);
  const top = coarse ? Math.min(sel.rect.bottom + 14, window.innerHeight - 56) : Math.max(8, sel.rect.top - 48);
  if (sel.rect.bottom < 0 || sel.rect.top > window.innerHeight) return null;

  async function quote() {
    if (!sel) return;
    setBusy(true);
    const draft = await previewSceneQuote({ storyPostId, entryIds: Object.keys(sel.excerpts), excerpts: sel.excerpts });
    setBusy(false);
    if ("error" in draft) return setError(draft.error);
    requestQuote(draft);
    window.getSelection()?.removeAllRanges();
    setSel(null);
    onQuoted();
  }

  return createPortal(
    <div
      role="toolbar"
      aria-label="Markierte Textstelle"
      style={{ top, left }}
      className="fixed z-40 flex flex-col gap-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-lg">
        {canQuote && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void quote()}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
          >
            <Quote className="h-3.5 w-3.5" strokeWidth={2} />
            Im Chat zitieren
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          title="Als Notiz speichern"
          onClick={async () => {
            setBusy(true);
            const err = await onNote(sel.excerpts);
            setBusy(false);
            if (err) return setError(err);
            window.getSelection()?.removeAllRanges();
            setSel(null);
          }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
        >
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
          Notiz
        </button>
        <button
          type="button"
          onClick={() => {
            const excerpts = sel.excerpts;
            window.getSelection()?.removeAllRanges();
            setSel(null);
            onSave(excerpts);
          }}
          className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
          Speichern
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-[16rem] rounded-lg bg-surface px-2 py-1 text-xs text-red-600 shadow dark:text-red-400">
          {error}
        </p>
      )}
    </div>,
    document.body,
  );
}
