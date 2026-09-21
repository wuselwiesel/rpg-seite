"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export type CropAspect = { id: string; label: string; ratio: number };

export const ASPECTS = {
  square: { id: "square", label: "Quadrat", ratio: 1 },
  portrait: { id: "portrait", label: "Hochformat 4:5", ratio: 4 / 5 },
  landscape: { id: "landscape", label: "Querformat 16:9", ratio: 16 / 9 },
  story: { id: "story", label: "Story 9:16", ratio: 9 / 16 },
  cover: { id: "cover", label: "Titelbild 3:1", ratio: 3 },
} satisfies Record<string, CropAspect>;

// GIFs (Animation) und SVGs werden nie zugeschnitten.
export function canCrop(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/gif" && file.type !== "image/svg+xml";
}

// Zuschneide-Fenster: Bild mit dem Finger/der Maus verschieben, mit Regler oder Zwei-Finger-Geste zoomen.
export function ImageCropper({
  file,
  aspects,
  round = false,
  title = "Bild zuschneiden",
  allowOriginal = true,
  onDone,
  onCancel,
}: {
  file: File;
  aspects: CropAspect[];
  round?: boolean;
  title?: string;
  allowOriginal?: boolean;
  onDone: (file: File) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [aspect, setAspect] = useState<CropAspect>(aspects[0]);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [viewport, setViewport] = useState({ w: 360, h: 640 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = objectUrl;
    Promise.resolve().then(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Größe des Zuschnitt-Rahmens (immer komplett sichtbar).
  const box = useMemo(() => {
    const maxW = Math.min(viewport.w - 48, 460);
    const maxH = Math.max(180, viewport.h - 330);
    let w = maxW;
    let h = w / aspect.ratio;
    if (h > maxH) {
      h = maxH;
      w = h * aspect.ratio;
    }
    return { w, h };
  }, [viewport, aspect]);

  const baseScale = natural ? Math.max(box.w / natural.w, box.h / natural.h) : 1;
  const scale = baseScale * zoom;

  const clamp = useCallback(
    (x: number, y: number, s: number) => {
      if (!natural) return { x: 0, y: 0 };
      const maxX = Math.max(0, (natural.w * s - box.w) / 2);
      const maxY = Math.max(0, (natural.h * s - box.h) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    },
    [natural, box],
  );

  function changeZoom(next: number) {
    const z = Math.min(5, Math.max(1, next));
    setZoom(z);
    setPos((p) => clamp(p.x, p.y, baseScale * z));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      changeZoom((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
    } else if (drag.current) {
      setPos(clamp(drag.current.px + e.clientX - drag.current.x, drag.current.py + e.clientY - drag.current.y, scale));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    const remaining = Array.from(pointers.current.values())[0];
    drag.current = remaining ? { x: remaining.x, y: remaining.y, px: pos.x, py: pos.y } : null;
  }

  function pickAspect(a: CropAspect) {
    setAspect(a);
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }

  async function apply() {
    if (!natural) return;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const sw = box.w / scale;
      const sh = box.h / scale;
      const sx = natural.w / 2 - (box.w / 2 + pos.x) / scale;
      const sy = natural.h / 2 - (box.h / 2 + pos.y) / scale;
      const outW = Math.min(1350, Math.round(sw));
      const outH = Math.round(outW / aspect.ratio);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
      if (!blob) throw new Error("blob");
      onDone(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "bild"}.jpg`, { type: "image/jpeg" }));
    } catch {
      onDone(file);
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-fg">{title}</h2>
          <button type="button" onClick={onCancel} aria-label="Abbrechen" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {aspects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {aspects.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pickAspect(a)}
                aria-pressed={aspect.id === a.id}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  aspect.id === a.id ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => changeZoom(zoom - e.deltaY * 0.002)}
            style={{ width: box.w, height: box.h, touchAction: "none" }}
            className={`relative cursor-grab select-none overflow-hidden bg-black active:cursor-grabbing ${round ? "rounded-full" : "rounded-lg"}`}
          >
            {url && natural && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Vorschau des Zuschnitts"
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: natural.w * scale,
                  height: natural.h * scale,
                  maxWidth: "none",
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
              />
            )}
            {!round && (
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/40" />
                ))}
              </div>
            )}
          </div>
        </div>

        <label className="flex items-center gap-3 text-xs text-muted">
          Zoom
          <input
            type="range"
            min={1}
            max={5}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-[var(--accent-strong)]"
          />
        </label>
        <p className="text-xs text-muted">Bild verschieben, um den Ausschnitt zu wählen.</p>

        <div className="flex flex-wrap justify-end gap-2">
          {allowOriginal && (
            <button type="button" onClick={() => onDone(file)} className="rounded-md px-3 py-2 text-sm text-fg-soft hover:text-fg">
              Original verwenden
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            disabled={!natural || busy}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Schneide zu..." : "Zuschneiden"}
          </button>
        </div>
      </div>
    </div>
  );
}
