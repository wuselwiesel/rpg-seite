"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ListMusic, Music, Pause, Play, Plus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RevealRow } from "@/components/reveal-row";
import { parseMusicLink } from "@/lib/scene-music";
import { decideSync } from "@/lib/music-sync";
import type { SpotifyController, SpotifyPlayback } from "@/lib/spotify-embed";
import { SpotifyPlayer } from "./spotify-player";
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
// Gemeinsam hören: Wer teilt („Gemeinsam starten“), schickt Position und Pause-Zustand über einen Broadcast-Kanal; wer „Mithören“ wählt, springt an
// dieselbe Stelle und folgt Pause/Weiterspielen. Das geht nur bei Spotify (steuerbarer Player). Alleine hören bleibt wie gehabt.
type StartMessage = { trackId: string; by: string; byId: string };
type SyncMessage = StartMessage & { position: number; paused: boolean };
type Role = { kind: "host"; trackId: string } | { kind: "follow"; trackId: string; by: string; byId: string } | null;

export function SceneTracks({ storyPostId, tracks, canAdd, selfId, selfName }: { storyPostId: string; tracks: SceneTrack[]; canAdd: boolean; selfId: string; selfName: string }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [invite, setInvite] = useState<StartMessage | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [role, setRoleState] = useState<Role>(null);
  const [note, setNote] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const roleRef = useRef<Role>(null);
  const tracksRef = useRef(tracks);
  const controllers = useRef(new Map<string, SpotifyController>());
  const local = useRef(new Map<string, { position: number; paused: boolean; duration: number; at: number }>());
  const dismissed = useRef(new Set<string>());
  const lastHeard = useRef(0);
  const lastSent = useRef({ at: 0, paused: true });

  useEffect(() => {
    tracksRef.current = tracks;
  });

  function setRole(next: Role) {
    roleRef.current = next;
    setRoleState(next);
  }

  function send(event: "start" | "sync" | "stop", payload: StartMessage | SyncMessage) {
    void channelRef.current?.send({ type: "broadcast", event, payload });
  }

  // Wendet die Position des Hosts an: an dieselbe Stelle springen, mit ihm pausieren und weiterspielen.
  function applySync(msg: SyncMessage) {
    const controller = controllers.current.get(msg.trackId);
    const state = local.current.get(msg.trackId);
    if (!controller || !state) return;
    const estimated = state.paused ? state.position : state.position + (Date.now() - state.at);
    const action = decideSync({ position: msg.position, paused: msg.paused }, { position: estimated, paused: state.paused, duration: state.duration });
    try {
      if (action.type === "seek") {
        controller.seek(action.seconds);
        if (action.resume) controller.resume();
        setNote(null);
      } else if (action.type === "pause") controller.pause();
      else if (action.type === "preview-only") setNote("Bei dir läuft nur die Vorschau (etwa 30 Sekunden). Melde dich im Browser bei spotify.com an, dann kannst du ganze Titel mithören.");
    } catch {
      /* Player gerade nicht bereit */
    }
  }

  // Hinweis „X hört gerade …“ anbieten (nur für Titel dieser Szene und solange nicht weggeklickt)
  function offer(msg: StartMessage) {
    if (!tracksRef.current.some((t) => t.id === msg.trackId)) return;
    if (dismissed.current.has(`${msg.byId}:${msg.trackId}`)) return;
    setInvite((cur) => (cur && cur.byId === msg.byId && cur.trackId === msg.trackId ? cur : { trackId: msg.trackId, by: msg.by, byId: msg.byId }));
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`scene-music-${storyPostId}`)
      .on("broadcast", { event: "start" }, ({ payload }) => {
        const msg = payload as StartMessage;
        if (!msg?.byId || msg.byId === selfId) return;
        offer(msg);
      })
      .on("broadcast", { event: "sync" }, ({ payload }) => {
        const msg = payload as SyncMessage;
        if (!msg?.byId || msg.byId === selfId) return;
        const r = roleRef.current;
        if (r?.kind === "follow" && r.byId === msg.byId && r.trackId === msg.trackId) {
          lastHeard.current = Date.now();
          applySync(msg);
        } else if (!r || r.kind !== "follow") offer(msg);
      })
      .on("broadcast", { event: "stop" }, ({ payload }) => {
        const msg = payload as StartMessage;
        if (!msg?.byId || msg.byId === selfId) return;
        dismissed.current.delete(`${msg.byId}:${msg.trackId}`);
        setInvite((cur) => (cur && cur.byId === msg.byId ? null : cur));
        const r = roleRef.current;
        if (r?.kind === "follow" && r.byId === msg.byId) {
          setRole(null);
          setNote(`${msg.by} hat aufgehört. Bei dir läuft es weiter, bis du es anhältst.`);
        }
      })
      .subscribe();
    channelRef.current = channel;

    // Hört der Host (z. B. Fenster zu) nicht mehr, wird das Mithören nach einer Weile beendet
    const watchdog = window.setInterval(() => {
      const r = roleRef.current;
      if (r?.kind === "follow" && Date.now() - lastHeard.current > 12_000) {
        setRole(null);
        setNote(`${r.by} sendet nicht mehr. Bei dir läuft es weiter, bis du es anhältst.`);
      }
    }, 3000);

    return () => {
      window.clearInterval(watchdog);
      const r = roleRef.current;
      if (r?.kind === "host") send("stop", { trackId: r.trackId, by: selfName, byId: selfId });
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // offer/applySync/send nutzen nur Refs und Setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId, selfId]);

  // Position des eigenen Players: merken, und als Host regelmäßig (alle 2 s, sofort bei Pause/Weiterspielen) an die anderen schicken
  function handleUpdate(trackId: string, s: SpotifyPlayback) {
    local.current.set(trackId, { position: s.position, paused: s.isPaused, duration: s.duration, at: Date.now() });
    const r = roleRef.current;
    if (r?.kind !== "host" || r.trackId !== trackId || s.isBuffering) return;
    const now = Date.now();
    if (s.isPaused !== lastSent.current.paused || now - lastSent.current.at >= 2000) {
      lastSent.current = { at: now, paused: s.isPaused };
      send("sync", { trackId, by: selfName, byId: selfId, position: s.position, paused: s.isPaused });
    }
  }

  function startTogether(id: string) {
    const track = tracks.find((t) => t.id === id);
    const spotify = track ? parseMusicLink(track.url)?.kind === "spotify" : false;
    setPlaying(id);
    setSent(id);
    if (spotify) {
      lastSent.current = { at: 0, paused: true };
      setRole({ kind: "host", trackId: id });
    }
    send("start", { trackId: id, by: selfName, byId: selfId });
    window.setTimeout(() => setSent((x) => (x === id ? null : x)), 4000);
  }

  function joinInvite() {
    if (!invite) return;
    const track = tracks.find((t) => t.id === invite.trackId);
    if (track) {
      const spotify = parseMusicLink(track.url)?.kind === "spotify";
      setOpen(true);
      setPlaying(invite.trackId);
      setNote(null);
      if (spotify) {
        lastHeard.current = Date.now();
        setRole({ kind: "follow", trackId: invite.trackId, by: invite.by, byId: invite.byId });
      }
    }
    setInvite(null);
  }

  function closeInvite() {
    if (invite) dismissed.current.add(`${invite.byId}:${invite.trackId}`);
    setInvite(null);
  }

  function stopSharing() {
    const r = roleRef.current;
    if (r?.kind === "host") send("stop", { trackId: r.trackId, by: selfName, byId: selfId });
    setRole(null);
  }

  function togglePlay(id: string) {
    const r = roleRef.current;
    if (playing === id) {
      if (r?.trackId === id) {
        if (r.kind === "host") stopSharing();
        else setRole(null);
      }
      setPlaying(null);
      setNote(null);
    } else {
      setPlaying(id);
    }
  }

  const inviteTrack = invite ? tracks.find((t) => t.id === invite.trackId) : null;
  const inviteSpotify = inviteTrack ? parseMusicLink(inviteTrack.url)?.kind === "spotify" : false;

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
      if (roleRef.current?.trackId === id) stopSharing();
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
      {invite && inviteTrack && (
        <div className="flex basis-full flex-wrap items-center gap-2 rounded-xl bg-accent-strong/15 px-3 py-2 text-sm text-fg" role="status">
          <Users className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
          <span className="min-w-0 flex-1">
            {invite.by} hört gerade <span className="font-medium">{trackLabel(inviteTrack)}</span>
            {inviteSpotify && <span className="block text-xs text-fg-soft">Mithören springt an dieselbe Stelle und folgt Pause und Weiterspielen.</span>}
          </span>
          <button type="button" onClick={joinInvite} className="rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90">
            Mithören
          </button>
          <button type="button" onClick={closeInvite} aria-label="Hinweis schließen" className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
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
                      <>
                        {link && (
                          <button
                            type="button"
                            onClick={() => startTogether(t.id)}
                            aria-label="Gemeinsam starten"
                            title={sent === t.id ? "Hinweis gesendet" : "Gemeinsam starten"}
                            className={`rounded-full p-1.5 transition hover:bg-surface-2 ${sent === t.id ? "text-accent" : "text-muted hover:text-fg"}`}
                          >
                            <Users className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        )}
                        {t.canRemove && (
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
                        )}
                      </>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => togglePlay(t.id)}
                      disabled={!link}
                      aria-label={isPlaying ? "Anhalten" : "Abspielen"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Play className="h-3.5 w-3.5" strokeWidth={2.25} />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{trackLabel(t)}</span>
                      <span className="block truncate text-xs text-muted">
                        {role?.trackId === t.id && role.kind === "host" ? "Du teilst gerade, andere können mithören" : role?.trackId === t.id && role.kind === "follow" ? `Du hörst mit bei ${role.by}` : `von ${t.addedBy}`}
                      </span>
                    </span>
                    {role?.trackId === t.id && (
                      <button
                        type="button"
                        onClick={() => (role.kind === "host" ? stopSharing() : setRole(null))}
                        className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-soft transition hover:text-fg"
                      >
                        {role.kind === "host" ? "Teilen beenden" : "Selbst weiterhören"}
                      </button>
                    )}
                    {isPlaying && link && (
                      <div className="basis-full pt-1">
                        {link.kind === "audio" ? (
                          <audio src={link.src} controls autoPlay className="w-full" />
                        ) : link.kind === "spotify" && link.uri ? (
                          <SpotifyPlayer
                            uri={link.uri}
                            height={link.detail && !["Titel", "Folge"].includes(link.detail) ? 352 : 152}
                            autoplay={role?.trackId === t.id}
                            onReady={(c) => {
                              if (c) controllers.current.set(t.id, c);
                              else {
                                controllers.current.delete(t.id);
                                local.current.delete(t.id);
                              }
                            }}
                            onUpdate={(state) => handleUpdate(t.id, state)}
                          />
                        ) : (
                          <iframe
                            src={link.embed}
                            title={`Musik (${link.label})`}
                            allow="autoplay; encrypted-media"
                            referrerPolicy="strict-origin-when-cross-origin"
                            loading="lazy"
                            className={`w-full rounded-xl border-0 ${link.kind === "youtube" ? "aspect-video" : "h-[152px]"}`}
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
          {note && <p className="mt-2 text-xs text-fg-soft">{note}</p>}
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </>
  );
}
