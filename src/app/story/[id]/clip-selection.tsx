"use client";

import { createPortal } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BookOpen, Bookmark, Check, Quote, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { defaultClipTitle } from "@/lib/clips";
import { MAX_CLIP_ENTRIES_CLIENT } from "@/lib/clip-limits";
import { requestQuote, visibleEntryElement, visibleEntryIds } from "@/lib/scene-quote";
import { previewSceneQuote, saveSceneClip } from "@/app/story/clip-actions";

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

  const cancel = useCallback(() => {
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
      {/* Per Portal an <body>: Der Seitenrahmen bildet einen eigenen Stapel, darin läge alles unter der Kopfzeile */}
      {(anchor || toast) &&
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
          entryIds={selected}
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
  characters,
  activeCharacterId,
  onClose,
  onSaved,
}: {
  storyPostId: string;
  sceneTitle: string;
  entryIds: string[];
  characters: { id: string; name: string }[];
  activeCharacterId: string | null;
  onClose: () => void;
  onSaved: (characterCount: number, message?: string) => void;
}) {
  const [title, setTitle] = useState(() => {
    const first = visibleEntryElement(entryIds[0])?.querySelector(".post-content")?.textContent ?? "";
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
      result = await saveSceneClip({ storyPostId, entryIds, title, note, characterIds: chosen, collectionName: collection, publishToWiki: wiki });
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
        <h2 className="font-serif text-xl text-fg">{entryIds.length === 1 ? "Nachricht speichern" : `${entryIds.length} Nachrichten speichern`}</h2>
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
