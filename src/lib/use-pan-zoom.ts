"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { clampView, zoomAround, type View } from "@/lib/wiki-map";

// Zoomen und Verschieben für eine Fläche der Größe w × h (Einheiten, nicht Pixel): Mausrad, Ziehen, Pinch mit zwei Fingern.
// `moved` ist true, wenn die letzte Berührung ein Ziehen war und kein Tippen (damit Klicks auf Knoten dann ignoriert werden).
export function usePanZoom(ref: RefObject<HTMLElement | SVGElement | null>, w: number, h: number) {
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "pan" | "pinch"; sx: number; sy: number; start: View; dist: number; mx: number; my: number } | null>(null);
  const moved = useRef(false);

  // Faktor Einheiten pro Pixel und Ursprung des Elements
  const frame = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    const width = r?.width || 1;
    return { k: w / width, left: r?.left ?? 0, top: r?.top ?? 0 };
  }, [ref, w]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (ev: Event) => {
      const e = ev as WheelEvent;
      e.preventDefault();
      const f = frame();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setView((v) => zoomAround(v, factor, (e.clientX - f.left) * f.k, (e.clientY - f.top) * f.k, w, h));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, frame, w, h]);

  // Den Zeiger erst beim echten Ziehen festhalten: sonst landet ein einfacher Klick auf einem Knoten bei der Fläche statt beim Knoten.
  const capture = (id: number) => {
    try {
      ref.current?.setPointerCapture(id);
    } catch {
      /* Zeiger schon weg */
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const f = frame();
    if (pointers.current.size === 1) {
      moved.current = false;
      gesture.current = { kind: "pan", sx: e.clientX, sy: e.clientY, start: view, dist: 0, mx: 0, my: 0 };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      moved.current = true;
      for (const id of pointers.current.keys()) capture(id);
      gesture.current = {
        kind: "pinch",
        sx: 0,
        sy: 0,
        start: view,
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: ((a.x + b.x) / 2 - f.left) * f.k,
        my: ((a.y + b.y) / 2 - f.top) * f.k,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const f = frame();
    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = ((a.x + b.x) / 2 - f.left) * f.k;
      const my = ((a.y + b.y) / 2 - f.top) * f.k;
      const z = zoomAround(g.start, dist / g.dist, g.mx, g.my, w, h);
      setView(clampView({ scale: z.scale, tx: z.tx + (mx - g.mx), ty: z.ty + (my - g.my) }, w, h));
    } else if (g.kind === "pan") {
      const dx = e.clientX - g.sx;
      const dy = e.clientY - g.sy;
      if (!moved.current && Math.hypot(dx, dy) > 4) {
        moved.current = true;
        capture(e.pointerId);
      }
      if (moved.current) setView(clampView({ scale: g.start.scale, tx: g.start.tx + dx * f.k, ty: g.start.ty + dy * f.k }, w, h));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && gesture.current?.kind === "pinch") gesture.current = null;
    if (pointers.current.size === 0) gesture.current = null;
  };

  const zoomBy = (factor: number) => setView((v) => zoomAround(v, factor, w / 2, h / 2, w, h));
  const reset = () => setView({ scale: 1, tx: 0, ty: 0 });

  return { view, setView, moved, zoomBy, reset, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
