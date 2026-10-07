"use client";

import { useEffect, useRef, useState } from "react";
import { loadSpotifyApi, type SpotifyController, type SpotifyPlayback } from "@/lib/spotify-embed";

// Spotify-Player mit Steuerung: meldet Position und Pause-Zustand und lässt sich von außen steuern (für „Mithören“).
export function SpotifyPlayer({
  uri,
  height,
  autoplay = false,
  onReady,
  onUpdate,
}: {
  uri: string;
  height: number;
  autoplay?: boolean;
  onReady?: (controller: SpotifyController | null) => void;
  onUpdate?: (state: SpotifyPlayback) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Aktuelle Rückrufe, ohne den Player neu aufzubauen
  const cb = useRef({ onReady, onUpdate });
  useEffect(() => {
    cb.current = { onReady, onUpdate };
  });

  useEffect(() => {
    let cancelled = false;
    let controller: SpotifyController | null = null;
    // Der Player wird in ein eigenes Kind-Element gesetzt, das beim Aufräumen mit entfernt wird (Spotify ersetzt es durch ein iframe)
    const mount = document.createElement("div");
    host.current?.appendChild(mount);
    loadSpotifyApi()
      .then((api) => {
        if (cancelled) return;
        api.createController(mount, { uri, width: "100%", height }, (c) => {
          if (cancelled) {
            c.destroy();
            return;
          }
          controller = c;
          c.addListener("ready", () => {
            if (autoplay) c.play();
          });
          c.addListener("playback_update", (e) => cb.current.onUpdate?.(e.data));
          cb.current.onReady?.(c);
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      cb.current.onReady?.(null);
      try {
        controller?.destroy();
      } catch {
        /* egal */
      }
      mount.remove();
    };
  }, [uri, height, autoplay]);

  if (failed) return <p className="py-2 text-xs text-muted">Der Spotify-Player konnte nicht geladen werden.</p>;
  return <div ref={host} className="w-full overflow-hidden rounded-xl" style={{ minHeight: height }} />;
}
