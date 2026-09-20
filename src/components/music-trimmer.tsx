"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export const MAX_CLIP_SECONDS = 30;

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Ausschnitt eines Songs wählen: Fenster auf der Zeitleiste verschieben, Länge bis 30 s (oder kürzer).
export function MusicTrimmer({
  url,
  start,
  length,
  onChange,
}: {
  url: string;
  start: number;
  length: number;
  onChange: (next: { start: number; length: number }) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(start);
  const dragRef = useRef<{ dx: number } | null>(null);

  const total = duration || MAX_CLIP_SECONDS;
  const maxLen = Math.min(MAX_CLIP_SECONDS, total);
  const len = Math.min(length, maxLen);
  const st = Math.min(start, Math.max(0, total - len));

  function setClip(nextStart: number, nextLen: number) {
    const l = Math.min(Math.max(1, nextLen), maxLen);
    const s = Math.min(Math.max(0, nextStart), Math.max(0, total - l));
    onChange({ start: Math.round(s * 10) / 10, length: Math.round(l * 10) / 10 });
    const el = audioRef.current;
    if (el && (el.currentTime < s || el.currentTime > s + l)) el.currentTime = s;
  }

  // Vorschau: nur den gewählten Ausschnitt abspielen (und wiederholen).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    function onTime() {
      if (!el) return;
      setPos(el.currentTime);
      if (el.currentTime >= st + len - 0.05) el.currentTime = st;
    }
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [st, len]);

  useEffect(() => {
    const el = audioRef.current;
    return () => el?.pause();
  }, []);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    if (el.currentTime < st || el.currentTime >= st + len) el.currentTime = st;
    el.play().catch(() => {});
  }

  function pointToTime(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return ((clientX - rect.left) / rect.width) * total;
  }

  const left = (st / total) * 100;
  const width = (len / total) * 100;
  const playhead = playing ? Math.min(100, Math.max(0, (pos / total) * 100)) : null;

  return (
    <div className="flex flex-col gap-3">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
            e.currentTarget.currentTime = Math.min(start, Math.max(0, d - Math.min(length, d)));
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Vorschau pausieren" : "Ausschnitt anhören"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90"
        >
          {playing ? <Pause className="h-4 w-4" strokeWidth={2} fill="currentColor" /> : <Play className="h-4 w-4" strokeWidth={2} fill="currentColor" />}
        </button>

        <div
          ref={trackRef}
          className="relative h-11 min-w-0 flex-1 touch-none select-none overflow-hidden rounded-lg bg-surface-3"
          onPointerDown={(e) => {
            // Klick auf die Leiste setzt den Ausschnitt (Mitte) dorthin; danach lässt er sich ziehen.
            const t = pointToTime(e.clientX);
            const inside = t >= st && t <= st + len;
            dragRef.current = { dx: inside ? t - st : len / 2 };
            e.currentTarget.setPointerCapture(e.pointerId);
            if (!inside) setClip(t - len / 2, len);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            setClip(pointToTime(e.clientX) - dragRef.current.dx, len);
          }}
          onPointerUp={() => (dragRef.current = null)}
          onPointerCancel={() => (dragRef.current = null)}
        >
          <div
            role="slider"
            tabIndex={0}
            aria-label="Beginn des Ausschnitts"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.round(total - len))}
            aria-valuenow={Math.round(st)}
            aria-valuetext={`ab ${fmt(st)}`}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setClip(st - 1, len);
              else if (e.key === "ArrowRight") setClip(st + 1, len);
              else return;
              e.preventDefault();
            }}
            className="absolute inset-y-0 cursor-grab rounded-lg border-2 border-accent-strong bg-accent-strong/25 outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            <span className="absolute inset-y-2 left-1 w-0.5 rounded-full bg-accent-strong/70" />
            <span className="absolute inset-y-2 right-1 w-0.5 rounded-full bg-accent-strong/70" />
          </div>
          {playhead !== null && (
            <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-fg" style={{ left: `${playhead}%` }} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="w-24 shrink-0 tabular-nums text-fg-soft">
          {fmt(st)} – {fmt(st + len)}
        </span>
        <label className="flex min-w-0 flex-1 items-center gap-2">
          Länge
          <input
            type="range"
            min={1}
            max={Math.max(1, Math.floor(maxLen))}
            step={1}
            value={Math.round(len)}
            onChange={(e) => setClip(st, Number(e.target.value))}
            aria-label="Länge des Ausschnitts in Sekunden"
            className="min-w-0 flex-1 accent-[var(--accent-strong)]"
          />
          <span className="w-8 text-right tabular-nums text-fg-soft">{Math.round(len)} s</span>
        </label>
      </div>
    </div>
  );
}
