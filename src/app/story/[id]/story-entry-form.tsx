"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createStoryEntry } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDraft } from "@/lib/use-draft";
import type { Character } from "@/lib/types";

export function StoryEntryForm({
  storyPostId,
  worldId,
  characterName,
  characters,
  participantIds,
  narrator,
  showToolbar,
  writerId,
  onTyping,
}: {
  storyPostId: string;
  worldId: string;
  characterName: string;
  characters: Character[];
  participantIds: string[];
  narrator: boolean;
  showToolbar: boolean;
  writerId: string;
  // Meldet anderen, die die Szene offen haben, dass hier gerade geschrieben wird.
  onTyping?: () => void;
}) {
  const selectable = characters.filter((c) => c.id !== writerId);
  const involved = selectable.filter((c) => participantIds.includes(c.id));
  const others = selectable.filter((c) => !participantIds.includes(c.id));
  const action = createStoryEntry.bind(null, storyPostId, worldId);
  const [error, formAction, pending] = useActionState(action, null);
  const [resetKey, setResetKey] = useState(0);
  // Inhalt, mit dem der Editor nach einem Zurücksetzen startet (leer; bei einem Fehler der gesendete Text).
  const [restoreText, setRestoreText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const latestHtml = useRef("");
  const sentHtml = useRef("");
  const wasPending = useRef(false);
  const { draft, restored, update, clear } = useDraft(`draft:entry:${storyPostId}`, { content: "" });

  // Wie im Chat: Nach dem Senden bleibt das Schreibfeld an derselben Stelle auf dem Bildschirm (die neue Nachricht schiebt sich darüber),
  // die Seite springt nicht nach oben, und man kann gleich weiterschreiben. Sobald man selbst scrollt, hört das auf.
  const stopKeeping = useRef<(() => void) | null>(null);
  function keepInPlace() {
    const form = formRef.current;
    if (!form) return;
    const startTop = form.getBoundingClientRect().top;
    if (startTop < 0 || startTop > window.innerHeight) return;
    stopKeeping.current?.();
    const started = performance.now();
    let raf = 0;
    // Die Höhe der Seite ändert sich, wenn die neue Nachricht erscheint: gleich vor dem Zeichnen nachziehen, damit nichts flackert.
    const observer = new ResizeObserver(() => correct());
    const stop = () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      stopKeeping.current = null;
    };
    stopKeeping.current = stop;
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    function correct() {
      const el = formRef.current;
      if (!el) return;
      const diff = el.getBoundingClientRect().top - startTop;
      if (Math.abs(diff) > 1) window.scrollBy(0, diff);
    }
    observer.observe(document.body);
    const tick = () => {
      if (!formRef.current || performance.now() - started > 4000) return stop();
      correct();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  useEffect(() => () => stopKeeping.current?.(), []);

  // Nach dem Zurücksetzen steht der Cursor sofort wieder im Schreibfeld
  useEffect(() => {
    if (resetKey === 0) return;
    let tries = 0;
    let raf = 0;
    const focus = () => {
      const editor = formRef.current?.querySelector<HTMLElement>(".ProseMirror");
      if (editor) editor.focus({ preventScroll: true });
      else if (++tries < 30) raf = requestAnimationFrame(focus);
    };
    raf = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(raf);
  }, [resetKey]);

  // Sofort beim Absenden leeren; schlägt das Senden fehl, kommt der Text zurück.
  function handleSubmit() {
    keepInPlace();
    sentHtml.current = latestHtml.current;
    // Erst nach dem Absenden leeren: Das Formular hat seine Daten dann schon eingesammelt.
    setTimeout(() => {
      clear();
      update({ content: "" });
      setRestoreText("");
      setResetKey((k) => k + 1);
    }, 30);
  }

  useEffect(() => {
    if (wasPending.current && !pending && error) {
      setRestoreText(sentHtml.current);
      update({ content: sentHtml.current });
      setResetKey((k) => k + 1);
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="character_id" value={writerId} />
      {narrator && <input type="hidden" name="narrator" value="on" />}
      {restored && (
      <RichTextEditor
        key={resetKey}
        name="content"
        // Nach dem Absenden startet der Editor leer; der (noch nicht aktualisierte) Entwurf darf nicht zurückkehren.
        initialContent={resetKey > 0 ? restoreText : draft.content}
        onChange={(html) => {
          latestHtml.current = html;
          update({ content: html });
          if (html) onTyping?.();
        }}
        mentionCharacters={characters}
        onSubmitKey={() => formRef.current?.requestSubmit()}
        minHeight={100}
        showToolbar={showToolbar}
        allowFontSelection
        placeholder={
          narrator
            ? "Erzähle, was geschieht – als Erzähler:in, ohne Charakter..."
            : `Schreib die Geschichte weiter als ${characterName}... (@ um Charaktere zu markieren)`
        }
      />
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sende..." : narrator ? "Als Erzähler:in senden" : "Weiterschreiben"}
        </button>
        {selectable.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Danach dran:
            <select
              name="next_character_id"
              defaultValue=""
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg-soft outline-none focus:border-accent"
            >
              <option value="">automatisch (zuletzt Schreibende:r)</option>
              {involved.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {others.length > 0 && (
                <optgroup label="Weitere">
                  {others.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__none__">niemand bestimmtes</option>
            </select>
          </label>
        )}
      </div>
    </form>
  );
}
