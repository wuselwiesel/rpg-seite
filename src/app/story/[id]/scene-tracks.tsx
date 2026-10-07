"use client";

import { useState, useTransition } from "react";
import { ListMusic, Music, Pause, Play, Plus, X } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { parseMusicLink } from "@/lib/scene-music";
import { addSceneTrack, removeSceneTrack } from "../actions";

export type SceneTrack = { id: string; url: string; title: string | null; addedBy: string; canRemove: boolean };

function trackLabel(track: SceneTrack): string {
  const link = parseMusicLink(track.url);
  if (track.title) return track.title;
  if (!link) return track.url;
  if (link.kind === "audio") return link.label;
  return link.kind === "spotify" && link.detail ? `${link.label} · ${link.detail}` : link.label;
}

// Musikliste einer Szene: alle Mitspielenden hängen Links an (Spotify, YouTube, SoundCloud, Audiodatei); ein Tipp auf Abspielen lädt den Player des Titels.
export function SceneTracks({ storyPostId, tracks, canAdd }: { storyPostId: string; tracks: SceneTrack[]; canAdd: boolean }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (tracks.length === 0 && !canAdd) return null;

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const err = await addSceneTrack(storyPostId, url, title);
      if (err) return setError(err);
      setUrl("");
      setTitle("");
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const err = await removeSceneTrack(id, storyPostId);
      if (err) return setError(err);
      if (playing === id) setPlaying(null);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft transition hover:text-accent"
      >
        {open ? <X className="h-3 w-3" strokeWidth={2} /> : tracks.length > 1 ? <ListMusic className="h-3 w-3" strokeWidth={2} /> : <Music className="h-3 w-3" strokeWidth={2} />}
        {open ? "Musik schließen" : tracks.length > 0 ? `Musik · ${tracks.length}` : "Musik hinzufügen"}
      </button>
      {open && (
        <div className="basis-full rounded-xl border border-line bg-surface p-2">
          {tracks.length > 0 && (
            <ul className="flex flex-col">
              {tracks.map((t) => {
                const link = parseMusicLink(t.url);
                const isPlaying = playing === t.id;
                return (
                  <RevealRow
                    key={t.id}
                    keepVisible={isPlaying}
                    className="flex-wrap rounded-lg px-1 py-1"
                    actions={
                      t.canRemove ? (
                        <button
                          type="button"
                          onClick={() => remove(t.id)}
                          disabled={pending}
                          aria-label="Titel entfernen"
                          title="Entfernen"
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      ) : null
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setPlaying(isPlaying ? null : t.id)}
                      disabled={!link}
                      aria-label={isPlaying ? "Anhalten" : "Abspielen"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Play className="h-3.5 w-3.5" strokeWidth={2.25} />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{trackLabel(t)}</span>
                      <span className="block truncate text-xs text-muted">von {t.addedBy}</span>
                    </span>
                    {isPlaying && link && (
                      <div className="basis-full pt-1">
                        {link.kind === "audio" ? (
                          <audio src={link.src} controls autoPlay className="w-full" />
                        ) : (
                          <iframe
                            src={link.embed}
                            title={`Musik (${link.label})`}
                            allow="autoplay; encrypted-media"
                            referrerPolicy="strict-origin-when-cross-origin"
                            loading="lazy"
                            className={`w-full rounded-xl border-0 ${
                              link.kind === "youtube" ? "aspect-video" : link.kind === "spotify" && link.detail && !["Titel", "Folge"].includes(link.detail) ? "h-[352px]" : "h-[152px]"
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </RevealRow>
                );
              })}
            </ul>
          )}
          {canAdd && (
            <form onSubmit={add} className={`flex flex-wrap items-center gap-2 ${tracks.length > 0 ? "mt-2 border-t border-line pt-2" : ""}`}>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={500}
                required
                placeholder="Link (Spotify, YouTube …)"
                aria-label="Musik-Link"
                className="min-w-0 flex-[2_1_12rem] rounded-md border border-line bg-app px-2.5 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Name (optional)"
                aria-label="Name des Titels"
                className="min-w-0 flex-[1_1_8rem] rounded-md border border-line bg-app px-2.5 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm"
              />
              <button
                type="submit"
                disabled={pending || !url.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                Hinzufügen
              </button>
            </form>
          )}
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </>
  );
}
