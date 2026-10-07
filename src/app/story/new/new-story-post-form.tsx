"use client";

import { useActionState, useState } from "react";
import { Feather } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { createStoryPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { WriterSelect } from "@/components/writer-select";
import { useDraft } from "@/lib/use-draft";
import { EventDateRange } from "@/components/event-date-fields";
import type { WikiCalendar } from "@/lib/wiki-calendar";
import type { Character, StoryArc } from "@/lib/types";

const NEW_ARC_VALUE = "__new__";

export function NewStoryPostForm({
  arcs,
  allCharacters,
  ownCharacters,
  activeCharacterId,
  locations,
  calendar,
}: {
  arcs: StoryArc[];
  allCharacters: Character[];
  ownCharacters: Character[];
  activeCharacterId: string | null;
  locations: string[];
  calendar: WikiCalendar;
}) {
  const [writerId, setWriterId] = useState(activeCharacterId ?? ownCharacters[0]?.id ?? "");
  const otherCharacters = allCharacters.filter((c) => c.id !== writerId);
  const [error, formAction, pending] = useActionState(createStoryPost, null);
  const [arcChoice, setArcChoice] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [narrator, setNarrator] = useState(false);
  // Wer auf jeden Fall in der Szene dabei ist (wird verlinkt und benachrichtigt)
  const [cast, setCast] = useState<string[]>([]);
  const { draft, restored, update, clear } = useDraft("draft:story-new", { title: "", content: "", location: "", in_world_time: "" });

  return (
    // createStoryPost redirect()s on success, which navigates away before any
    // pending/error transition would fire client-side - so the draft is
    // cleared optimistically on submit rather than after confirmation.
    <form action={formAction} onSubmit={() => clear()} className="flex flex-col gap-4">
      <input type="hidden" name="character_id" value={writerId} />
      {!narrator && <WriterSelect shortcuts characters={ownCharacters} value={writerId} onChange={setWriterId} />}
      {narrator && (
        <p className="text-xs text-muted">
          Du schreibst als <span className="text-sm font-medium text-fg-soft">Erzähler:in</span> – ohne Charakter.
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Titel
        <input
          type="text"
          name="title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          required
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        <div className="flex items-center justify-between">
          Inhalt
          <button
            type="button"
            onClick={() => setNarrator((v) => !v)}
            aria-pressed={narrator}
            title={narrator ? "Als Erzähler:in schreiben: an" : "Als Erzähler:in schreiben"}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition ${
              narrator ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Feather className="h-3.5 w-3.5" strokeWidth={2} />
            {narrator ? "Als Erzähler:in" : "Erzähler:in"}
          </button>
        </div>
        {narrator && <input type="hidden" name="narrator" value="on" />}
        {restored && (
          <RichTextEditor
            key="restored"
            name="content"
            initialContent={draft.content}
            placeholder="Erzähl, was gerade passiert..."
            onChange={(html) => update({ content: html })}
            allowFontSelection
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Ort (optional)
          <input
            type="text"
            name="location"
            list="story-locations"
            maxLength={80}
            value={draft.location}
            onChange={(e) => update({ location: e.target.value })}
            placeholder="z. B. Schattenbibliothek"
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
          <datalist id="story-locations">
            {locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Zeitpunkt in der Welt (optional)
          <input
            type="text"
            name="in_world_time"
            maxLength={80}
            value={draft.in_world_time}
            onChange={(e) => update({ in_world_time: e.target.value })}
            placeholder="z. B. Tag 3, Abenddämmerung"
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
      </div>

      <details className="rounded-lg border border-line bg-surface px-3 py-2">
        <summary className="cursor-pointer text-sm text-fg-soft">Datum im Kalender der Welt (optional, für die Zeitleiste)</summary>
        <div className="mt-3 flex flex-col gap-3">
          <EventDateRange calendar={calendar} dates={{ start: null, end: null }} />
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Kurzbeschreibung für die Zeitleiste
            <textarea name="short_summary" rows={2} maxLength={300} className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent" />
          </label>
        </div>
      </details>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Handlungsstrang (optional)
        <select
          value={arcChoice}
          onChange={(e) => setArcChoice(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          <option value="">Keinem Handlungsstrang zuordnen</option>
          {arcs.map((arc) => (
            <option key={arc.id} value={arc.id}>
              {arc.name}
            </option>
          ))}
          <option value={NEW_ARC_VALUE}>+ Neuen Handlungsstrang erschaffen</option>
        </select>
      </label>

      {arcChoice === NEW_ARC_VALUE ? (
        <input
          type="text"
          name="new_arc_name"
          required
          placeholder="z. B. Der Sturm-Arc"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      ) : (
        <input type="hidden" name="arc_id" value={arcChoice} />
      )}

      {otherCharacters.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-fg-soft">Mit dabei (optional)</legend>
          <div className="flex flex-wrap gap-1.5">
            {otherCharacters.map((c) => {
              const on = cast.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCast((prev) => (on ? prev.filter((id) => id !== c.id) : [...prev, c.id]))}
                  className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
                >
                  <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={22} />
                  {c.name}
                </button>
              );
            })}
          </div>
          {cast
            .filter((id) => otherCharacters.some((c) => c.id === id))
            .map((id) => (
              <input key={id} type="hidden" name="cast_character_id" value={id} />
            ))}
        </fieldset>
      )}

      {otherCharacters.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-line px-3 py-2.5">
          <label className="flex items-center gap-2 text-sm text-fg-soft">
            <input
              type="checkbox"
              name="is_private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-line"
            />
            Geheime Szene – nur für bestimmte Charaktere sichtbar
          </label>
          {isPrivate && (
            <div className="ml-6 flex flex-col gap-1.5">
              <p className="text-xs text-muted">Wer außer dir soll das sehen können?</p>
              {otherCharacters.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-fg-soft">
                  <input
                    type="checkbox"
                    name="viewer_character_id"
                    value={c.id}
                    className="rounded border-line"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Veröffentliche..." : "Szene beginnen"}
      </button>
    </form>
  );
}
