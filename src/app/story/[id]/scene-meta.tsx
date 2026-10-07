"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, ImagePlus, MapPin, Pencil, X } from "lucide-react";
import { EventDateRange } from "@/components/event-date-fields";
import { formatRange, type PageDates, type WikiCalendar } from "@/lib/wiki-calendar";
import { updateSceneAmbience, updateStoryMeta } from "../actions";
import { SceneTracks, type SceneTrack } from "./scene-tracks";
import { chatImageError } from "@/lib/chat-image";
import { uploadSceneImage } from "@/lib/scene-image";

// Ort und Zeitpunkt (in der Spielwelt) einer Szene; die Autor:in kann beides nachträglich ändern.
export function SceneMeta({
  storyPostId,
  location,
  inWorldTime,
  dates,
  calendar,
  canEdit,
  shortSummary = null,
  ambienceImage = null,
  tracks = [],
  canAddTracks = false,
  selfId = "",
  selfName = "",
}: {
  storyPostId: string;
  location: string | null;
  inWorldTime: string | null;
  dates: PageDates;
  calendar: WikiCalendar;
  canEdit: boolean;
  // Kurzbeschreibung für die Zeitleiste
  shortSummary?: string | null;
  ambienceImage?: string | null;
  tracks?: SceneTrack[];
  canAddTracks?: boolean;
  selfId?: string;
  selfName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [loc, setLoc] = useState(location ?? "");
  const [time, setTime] = useState(inWorldTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState(ambienceImage ?? "");
  const [uploading, setUploading] = useState(false);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = !file.type.startsWith("image/") ? "Bitte ein Bild wählen." : chatImageError(file);
    if (problem) return setError(problem);
    setUploading(true);
    setError(null);
    const result = await uploadSceneImage(file);
    setUploading(false);
    if ("error" in result) setError(result.error);
    else setImage(result.url);
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const dateForm = new FormData(e.currentTarget);
    startTransition(async () => {
      const err = await updateStoryMeta(storyPostId, loc, time, dateForm);
      if (err) return setError(err);
      if (image !== (ambienceImage ?? "")) {
        const ambienceError = await updateSceneAmbience(storyPostId, image);
        if (ambienceError) return setError(ambienceError);
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mb-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            maxLength={80}
            placeholder="Ort"
            className="w-40 rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            maxLength={80}
            placeholder="Zusatz, z. B. Abenddämmerung"
            className="w-56 rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-3">
          <EventDateRange calendar={calendar} dates={dates} />
        </div>
        <textarea
          name="short_summary"
          rows={2}
          maxLength={300}
          defaultValue={shortSummary ?? ""}
          placeholder="Kurzbeschreibung für die Zeitleiste"
          aria-label="Kurzbeschreibung für die Zeitleiste"
          className="rounded-md border border-line bg-app px-2.5 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          {image ? (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Hintergrundbild der Szene" className="h-14 w-24 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => setImage("")}
                aria-label="Hintergrundbild entfernen"
                title="Entfernen"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-fg text-app shadow"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
              {uploading ? "Lädt hoch…" : "Hintergrundbild"}
              <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending || uploading}
            className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong disabled:opacity-50"
          >
            Speichern
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:text-fg">
            Abbrechen
          </button>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    );
  }

  const dateLabel = formatRange(calendar, dates);
  if (!location && !inWorldTime && !dateLabel && !shortSummary && tracks.length === 0 && !canAddTracks && !canEdit) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-fg-soft">
      {location && (
        <Link
          href={`/story?ort=${encodeURIComponent(location)}`}
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 transition hover:text-accent"
        >
          <MapPin className="h-3 w-3" strokeWidth={2} />
          {location}
        </Link>
      )}
      {(dateLabel || inWorldTime) && (
        <Link
          href={dates.start ? `/wiki/kalender?jahr=${dates.start.year}&monat=${dates.start.month ?? 1}` : "/wiki/zeitleiste"}
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 transition hover:text-accent"
        >
          <Clock className="h-3 w-3" strokeWidth={2} />
          {[dateLabel, inWorldTime].filter(Boolean).join(", ")}
        </Link>
      )}
      <SceneTracks storyPostId={storyPostId} tracks={tracks} canAdd={canAddTracks} selfId={selfId} selfName={selfName} />
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <Pencil className="h-3 w-3" strokeWidth={2} />
          {location || inWorldTime || dateLabel || shortSummary || ambienceImage ? "Ändern" : "Ort und Zeit ergänzen"}
        </button>
      )}
    </div>
  );
}
