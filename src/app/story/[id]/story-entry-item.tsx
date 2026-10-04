"use client";

import { EmojiHtml } from "@/components/custom-emoji-provider";
import { useEffect, useRef, useState, useActionState } from "react";
import { Clover, Dices, Pencil, Trash2, Type } from "lucide-react";
import { updateStoryEntry, deleteStoryEntry, updateChapter } from "../actions";
import { EventDateFields } from "@/components/event-date-fields";
import { formatDate, type WikiCalendar } from "@/lib/wiki-calendar";
import { CharacterAvatar } from "@/components/character-avatar";
import { NarratorAvatar } from "@/components/narrator-avatar";
import { RichTextEditor } from "@/components/rich-text-editor";
import { formatDateTime } from "@/lib/format";
import type { Character, StoryEntry } from "@/lib/types";

export function StoryEntryItem({
  entry,
  storyPostId,
  canManage,
  mentionCharacters,
  chapterNumber,
  displayHtml,
  calendar,
  canEditChapter = false,
}: {
  entry: StoryEntry;
  storyPostId: string;
  canManage: boolean;
  mentionCharacters: Character[];
  chapterNumber?: number;
  // Mit Wiki-Links und Hashtag-Links angereicherte Fassung von entry.content.
  displayHtml?: string;
  // Für Kapitel-Marken: Kalender der Welt (Datum) und ob man sie bearbeiten darf
  calendar?: WikiCalendar;
  canEditChapter?: boolean;
}) {
  const isRoll = !!entry.roll_label;
  const isNarrator = entry.kind === "narrator";
  const [editing, setEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const updateAction = updateStoryEntry.bind(null, entry.id, storyPostId);
  const [error, formAction, pending] = useActionState(updateAction, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setEditing(false);
    wasPending.current = pending;
  }, [pending, error]);

  const [chapterEditing, setChapterEditing] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [chapterPending, setChapterPending] = useState(false);

  async function saveChapter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setChapterError(null);
    setChapterPending(true);
    const err = await updateChapter(entry.id, storyPostId, formData);
    setChapterPending(false);
    if (err) setChapterError(err);
    else setChapterEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const err = await deleteStoryEntry(entry.id, storyPostId);
    if (err) alert(err);
  }

  if (entry.kind === "chapter") {
    const chapterDate = entry.event_year != null && calendar ? formatDate(calendar, { year: entry.event_year, month: entry.event_month ?? null, day: entry.event_day ?? null }) : null;
    if (chapterEditing && calendar) {
      return (
        <form id={`kapitel-${chapterNumber}`} onSubmit={saveChapter} className="my-4 flex scroll-mt-20 flex-col gap-3 rounded-lg bg-surface-2 p-3">
          <input
            type="text"
            name="title"
            required
            maxLength={100}
            defaultValue={entry.chapter_title ?? entry.content}
            aria-label="Name des Kapitels"
            className="rounded-md border border-line bg-surface px-3 py-2 font-serif text-xl text-fg outline-none focus:border-accent"
          />
          <EventDateFields prefix="date" calendar={calendar} initial={entry.event_year != null ? { year: entry.event_year, month: entry.event_month ?? null, day: entry.event_day ?? null } : null} label="Datum im Kalender der Welt" />
          <textarea
            name="summary"
            maxLength={1500}
            rows={2}
            defaultValue={entry.chapter_summary ?? ""}
            placeholder="Was ist bisher geschehen? (für den Rückblick)"
            className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
          />
          {chapterError && <p className="text-xs text-red-600 dark:text-red-400">{chapterError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={chapterPending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
              {chapterPending ? "Speichert..." : "Speichern"}
            </button>
            <button type="button" onClick={() => setChapterEditing(false)} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-fg">
              Abbrechen
            </button>
          </div>
        </form>
      );
    }
    return (
      <div id={`kapitel-${chapterNumber}`} className="group my-4 scroll-mt-20 text-center">
        <div className="flex items-center gap-3 text-muted">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs">Kapitel {chapterNumber}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <h3 className="mt-2 font-serif text-2xl text-fg">{entry.chapter_title ?? entry.content}</h3>
        {chapterDate && <p className="mt-0.5 text-xs text-muted">{chapterDate}</p>}
        {entry.chapter_summary && (
          <p className="mx-auto mt-1 max-w-md text-sm italic text-muted">{entry.chapter_summary}</p>
        )}
        {(canEditChapter || canManage) && (
          <div className="mt-1 flex justify-center gap-3">
            {canEditChapter && calendar && (
              <button
                type="button"
                onClick={() => setChapterEditing(true)}
                className="text-xs text-muted transition hover:text-fg md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              >
                Kapitel bearbeiten
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-muted transition hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              >
                Kapitel entfernen
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {isNarrator ? (
        <NarratorAvatar size={32} />
      ) : (
        <CharacterAvatar
          name={entry.characters?.name ?? "?"}
          avatarUrl={entry.characters?.avatar_url}
          size={32}
        />
      )}
      <div id={`beitrag-${entry.id}`} className="flex-1 scroll-mt-24 rounded-lg border border-line bg-surface px-4 py-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium text-fg">{isNarrator ? "Erzähler:in" : entry.characters?.name}</p>
            <p className="text-xs text-muted">
              {formatDateTime(entry.created_at)}
              {entry.updated_at && " · bearbeitet"}
            </p>
          </div>
          {canManage && !editing && (
            <div className="flex shrink-0 items-center gap-1">
              {!isRoll && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  title="Bearbeiten"
                  className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                title="Löschen"
                className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <form action={formAction} className="flex flex-col gap-2">
            <RichTextEditor
              name="content"
              initialContent={entry.content}
              mentionCharacters={mentionCharacters}
              minHeight={80}
              showToolbar={showToolbar}
              allowFontSelection
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Speichere..." : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => setShowToolbar((v) => !v)}
                title={showToolbar ? "Formatierung ausblenden" : "Formatierung anzeigen"}
                className={`ml-auto flex h-7 w-7 items-center justify-center rounded-full transition ${
                  showToolbar ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Type className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </form>
        ) : isRoll ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Dices className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <span className="text-fg-soft">
              würfelt auf <span className="font-medium text-fg">„{entry.roll_label}“</span>
              {entry.roll_stat_name && <span className="text-muted"> ({entry.roll_stat_name})</span>}
              {entry.roll_condition && <span className="text-muted"> · {entry.roll_condition}</span>}
              {entry.roll_target_character?.name && (
                <>
                  {" "}
                  gegen <span className="font-medium text-fg">{entry.roll_target_character.name}</span>
                </>
              )}
              :{" "}
              {entry.roll_value != null ? (
                <>
                  {entry.roll_result}/{entry.roll_value + (entry.roll_bonus ?? 0)}
                  {entry.roll_bonus ? (
                    <span className="text-muted">
                      {" "}
                      ({entry.roll_value}
                      {entry.roll_bonus > 0 ? "+" : ""}
                      {entry.roll_bonus})
                    </span>
                  ) : null}{" "}
                  (W{entry.roll_die})
                </>
              ) : (
                <>{entry.roll_result} (W{entry.roll_die})</>
              )}
            </span>
            {entry.roll_value != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  entry.roll_success
                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                    : "bg-red-500/15 text-red-700 dark:text-red-400"
                }`}
              >
                {entry.roll_success ? "Erfolg" : "Misserfolg"}
              </span>
            )}
            {entry.roll_luck_remaining != null && (
              <span
                className="inline-flex items-center gap-0.5"
                title={`${entry.roll_luck_remaining} Glückspunkt${entry.roll_luck_remaining === 1 ? "" : "e"} übrig`}
              >
                {Array.from({ length: entry.roll_luck_remaining }, (_, i) => (
                  <Clover key={i} className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                ))}
                {entry.roll_luck_remaining === 0 && <span className="text-xs text-muted">0 Glück</span>}
              </span>
            )}
          </div>
        ) : (
          // Bereits serverseitig sanitisiert (siehe createStoryEntry/updateStoryEntry) -
          // Einträge kommen nie ungeprüft vom Client in die Datenbank.
          <EmojiHtml className="post-content text-sm text-fg-soft" html={displayHtml ?? entry.content} />
        )}
      </div>
    </div>
  );
}
