"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MusicTrimmer } from "@/components/music-trimmer";
import { ChevronLeft, ImagePlus, Music, Pause, Play, Search, Trash2, Type, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadPostMedia } from "@/lib/upload-media";
import { ASPECTS, ImageCropper, canCrop } from "@/components/image-cropper";
import { createStory } from "../actions";
import { OVERLAY_COLORS, STORY_BACKGROUNDS, STORY_DURATIONS, isDarkStoryBg, overlayColor } from "@/lib/stories";
import { OVERLAY_TEXT_STYLE, StoryStage } from "@/components/story-stage";
import type { StoryOverlay } from "@/lib/types";

const MAX_SIZE = 5 * 1024 * 1024;

type Song = { id: number; name: string; artist: string; art: string; preview: string };

// Song-Suche über die iTunes-Suche: liefert 30-Sekunden-Vorschauen (wie die Musik-Auswahl bei Instagram,
// nur ohne eigenen Katalog).
function MusicSearch({ onPick }: { onPick: (song: Song) => void }) {
  const [term, setTerm] = useState("");
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  async function search() {
    const q = term.trim();
    if (!q) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/music-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Suche fehlgeschlagen");
      const json = (await res.json()) as { songs: Song[] };
      setSongs(json.songs);
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }

  function togglePlay(song: Song) {
    audioRef.current?.pause();
    if (playing === song.id) return setPlaying(null);
    const el = new Audio(song.preview);
    el.onended = () => setPlaying(null);
    el.play().catch(() => setPlaying(null));
    audioRef.current = el;
    setPlaying(song.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Song oder Interpret suchen"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={search}
          aria-label="Suchen"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-soft hover:bg-surface-3"
        >
          <Search className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      {loading && <p className="text-xs text-muted">Suche...</p>}
      {failed && <p className="text-xs text-red-600 dark:text-red-400">Suche nicht erreichbar. Versuche es später erneut.</p>}
      {songs && songs.length === 0 && <p className="text-xs text-muted">Nichts gefunden.</p>}
      {songs && songs.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-lg border border-line">
          {songs.map((s) => (
            <li key={s.id} className="flex items-center gap-2 border-b border-line p-2 last:border-b-0">
              <button
                type="button"
                onClick={() => togglePlay(s)}
                aria-label={playing === s.id ? "Pause" : "Vorschau abspielen"}
                className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.art && <img src={s.art} alt="" className="h-full w-full object-cover" />}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                  {playing === s.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioRef.current?.pause();
                  setPlaying(null);
                  onPick(s);
                }}
                className="shrink-0 rounded-full bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong"
              >
                Wählen
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted">30-Sekunden-Vorschau, bereitgestellt von Apple Music.</p>
    </div>
  );
}

// Text direkt auf der Story: antippen zum Schreiben, ziehen zum Verschieben.
function DraggableText({
  overlay,
  selected,
  autoFocus,
  stageRef,
  onSelect,
  onChange,
}: {
  overlay: StoryOverlay;
  selected: boolean;
  autoFocus: boolean;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onChange: (patch: Partial<StoryOverlay>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerText = overlay.t;
    if (autoFocus) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // Nur beim Einbinden: danach gehört der Text dem contentEditable-Element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable={selected}
      suppressContentEditableWarning
      role="textbox"
      aria-label="Text auf der Story"
      onInput={(e) => onChange({ t: e.currentTarget.innerText })}
      onPointerDown={(e) => {
        onSelect();
        drag.current = { startX: e.clientX, startY: e.clientY, ox: overlay.x, oy: overlay.y, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const rect = stageRef.current?.getBoundingClientRect();
        if (!d || !rect) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved && Math.hypot(dx, dy) < 5) return;
        if (!d.moved) {
          d.moved = true;
          (document.activeElement as HTMLElement | null)?.blur();
        }
        onChange({
          x: Math.min(98, Math.max(2, d.ox + (dx / rect.width) * 100)),
          y: Math.min(98, Math.max(2, d.oy + (dy / rect.height) * 100)),
        });
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (d && !d.moved) ref.current?.focus();
      }}
      className={`absolute max-w-[92%] cursor-move whitespace-pre-wrap break-words rounded-md px-[1.5cqw] text-center font-serif outline-none ${
        selected ? "outline-dashed outline-2 outline-white/80" : ""
      }`}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        transform: "translate(-50%, -50%)",
        fontSize: `${overlay.size}cqw`,
        color: overlayColor(overlay.color),
        touchAction: "none",
        minWidth: "8cqw",
        ...OVERLAY_TEXT_STYLE,
      }}
    />
  );
}

export default function NewStoryPage() {
  const [error, formAction, pending] = useActionState(createStory, null);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ url: string; name: string; start: number; length: number } | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [bg, setBg] = useState(STORY_BACKGROUNDS[0].id);
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const selected = overlays.find((o) => o.id === selectedId) ?? null;
  const hasText = overlays.some((o) => o.t.trim());

  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (canCrop(file)) setCropFile(file);
    else void uploadMedia(file);
  }

  async function uploadMedia(file: File) {
    setUploading(true);
    setUploadError(null);
    const result = await uploadPostMedia(file);
    if ("error" in result) setUploadError(result.error);
    else if (file.type.startsWith("video/")) {
      setVideoUrl(result.url);
      setImageUrl("");
      setAudio(null);
    } else {
      setImageUrl(result.url);
      setVideoUrl("");
    }
    setUploading(false);
  }

  async function handleAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setUploadError("Audiodatei ist zu groß (max. 5 MB).");
      return;
    }
    setAudioUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const path = `stories/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error: err } = await supabase.storage.from("chat-media").upload(path, file);
    if (err) setUploadError(err.message);
    else setAudio({ url: supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl, name: file.name, start: 0, length: 30 });
    setAudioUploading(false);
  }

  function addText() {
    const id = crypto.randomUUID();
    const color = !imageUrl && !videoUrl && !isDarkStoryBg(bg) ? "black" : "white";
    setOverlays((prev) => [
      ...prev.slice(0, 7),
      { id, t: "Text", x: 50, y: 30 + (prev.length % 5) * 12, size: 8, color },
    ]);
    setSelectedId(id);
    setFreshId(id);
  }

  function patch(id: string, p: Partial<StoryOverlay>) {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4 sm:py-10">
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspects={[ASPECTS.story, ASPECTS.square, ASPECTS.portrait]}
          title="Story-Bild zuschneiden"
          onCancel={() => setCropFile(null)}
          onDone={(cropped) => {
            setCropFile(null);
            void uploadMedia(cropped);
          }}
        />
      )}
      <div className="mb-4 flex items-center gap-1">
        <Link
          href="/"
          aria-label="Zurück"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2} />
        </Link>
        <h1 className="font-serif text-3xl text-fg">Neue Story</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="image_url" value={imageUrl} />
        <input type="hidden" name="video_url" value={videoUrl} />
        <input type="hidden" name="bg" value={bg} />
        <input type="hidden" name="audio_url" value={audio?.url ?? ""} />
        <input type="hidden" name="audio_name" value={audio?.name ?? ""} />
        <input type="hidden" name="audio_start" value={audio?.start ?? 0} />
        <input type="hidden" name="audio_length" value={audio?.length ?? ""} />
        <input
          type="hidden"
          name="overlays"
          value={JSON.stringify(overlays.map((o) => ({ ...o, t: o.t.trim() })))}
        />

        <div
          className="relative mx-auto flex h-[min(62dvh,560px)] w-full items-center justify-center"
          style={{ containerType: "size" }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div ref={stageRef} className="relative">
            <StoryStage story={{ image_url: imageUrl || null, video_url: videoUrl || null, bg, overlays: null, text_content: null }}
              videoProps={{ muted: true, autoPlay: true, loop: true }}>
              {overlays.map((o) => (
                <DraggableText
                  key={o.id}
                  overlay={o}
                  selected={o.id === selectedId}
                  autoFocus={o.id === freshId}
                  stageRef={stageRef}
                  onSelect={() => setSelectedId(o.id)}
                  onChange={(p) => patch(o.id, p)}
                />
              ))}
              {!imageUrl && !videoUrl && overlays.length === 0 && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-neutral-800/70">
                  Füge ein Bild oder einen Text hinzu
                </p>
              )}
              {(imageUrl || videoUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setVideoUrl("");
                  }}
                  aria-label="Bild entfernen"
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              )}
            </StoryStage>
          </div>
        </div>

        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm font-medium text-fg-soft transition hover:bg-surface-2">
            <ImagePlus className="h-4 w-4" strokeWidth={2} />
            {uploading ? "Lädt hoch..." : imageUrl || videoUrl ? "Ändern" : "Foto / Video"}
            <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
          </label>
          <button
            type="button"
            onClick={addText}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm font-medium text-fg-soft transition hover:bg-surface-2"
          >
            <Type className="h-4 w-4" strokeWidth={2} />
            Text
          </button>
        </div>
        {!videoUrl && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 shrink-0 text-fg-soft" strokeWidth={2} />
            {audio ? (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{audio.name}</span>
                <button
                  type="button"
                  onClick={() => setAudio(null)}
                  aria-label="Musik entfernen"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMusicOpen((v) => !v)}
                  className="flex-1 py-1 text-left text-sm font-medium text-fg-soft"
                >
                  Musik hinzufügen
                </button>
                <label className="cursor-pointer rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-soft hover:bg-surface-3">
                  {audioUploading ? "Lädt..." : "Eigene Datei"}
                  <input type="file" accept="audio/*" onChange={handleAudio} className="hidden" />
                </label>
              </>
            )}
          </div>
          {audio && (
            <MusicTrimmer
              url={audio.url}
              start={audio.start}
              length={audio.length}
              onChange={({ start, length }) => setAudio((a) => (a ? { ...a, start, length } : a))}
            />
          )}
          {!audio && musicOpen && (
            <MusicSearch
              onPick={(song) => {
                setAudio({ url: song.preview, name: `${song.name} – ${song.artist}`, start: 0, length: 30 });
                setMusicOpen(false);
              }}
            />
          )}
        </div>
        )}
        {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}

        {selected && (
          <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">Größe</span>
              <input
                type="range"
                min={3}
                max={16}
                step={0.5}
                value={selected.size}
                onChange={(e) => patch(selected.id, { size: Number(e.target.value) })}
                aria-label="Textgröße"
                className="min-w-0 flex-1 accent-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => {
                  setOverlays((prev) => prev.filter((o) => o.id !== selected.id));
                  setSelectedId(null);
                }}
                aria-label="Text löschen"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex gap-2" role="radiogroup" aria-label="Textfarbe">
              {OVERLAY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected.color === c.id}
                  aria-label={`Farbe ${c.id}`}
                  onClick={() => patch(selected.id, { color: c.id })}
                  className={`h-8 w-8 rounded-full border-2 ${selected.color === c.id ? "border-fg" : "border-line"}`}
                  style={{ background: c.css }}
                />
              ))}
            </div>
          </div>
        )}

        {!imageUrl && !videoUrl && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hintergrund">
            <label
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-line"
              title="Eigene Farbe wählen"
              style={{
                background:
                  "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              }}
            >
              <input
                type="color"
                aria-label="Eigene Hintergrundfarbe"
                value={/^#[0-9a-f]{6}$/i.test(bg) ? bg : "#f6d365"}
                onChange={(e) => setBg(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {/^#[0-9a-f]{6}$/i.test(bg) && (
                <span className="h-5 w-5 rounded-full border-2 border-white" style={{ background: bg }} />
              )}
            </label>
            {STORY_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={bg === b.id}
                aria-label={`Hintergrund ${b.id}`}
                onClick={() => setBg(b.id)}
                className={`h-9 w-9 rounded-full border-2 ${bg === b.id ? "border-fg" : "border-transparent"}`}
                style={{ background: b.css }}
              />
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Sichtbar für
          <select
            name="hours"
            defaultValue={24}
            className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
          >
            {STORY_DURATIONS.map((d) => (
              <option key={d.hours} value={d.hours}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending || uploading || (!imageUrl && !videoUrl && !hasText)}
          className="rounded-md bg-accent-strong px-5 py-2.5 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Veröffentliche..." : "Story teilen"}
        </button>
      </form>
    </div>
  );
}
