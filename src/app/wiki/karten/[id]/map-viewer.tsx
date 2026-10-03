"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { SymbolPicker } from "@/components/symbol-picker";
import {
  clampView,
  pointToPercent,
  viewCenteredOn,
  zoomAround,
  type View,
  type WikiMap,
  type WikiMapPin,
} from "@/lib/wiki-map";
import { addMapPin, deletePin, movePin, updatePin } from "../actions";

type Option = { id: string; title: string };
type Draft = { id?: string; x: number; y: number; label: string; icon: string; pageId: string; targetMapId: string };

const btn = "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-40";
const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function MapViewer({
  map,
  initialPins,
  pages,
  otherMaps,
  initialPinId,
}: {
  map: WikiMap;
  initialPins: WikiMapPin[];
  pages: Option[];
  otherMaps: Option[];
  initialPinId?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [ratio, setRatio] = useState(16 / 10);
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [pins, setPins] = useState<WikiMapPin[]>(initialPins);
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialPinId ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "pan" | "pinch"; sx: number; sy: number; start: View; moved: boolean; dist: number; mx: number; my: number } | null>(null);
  const dragPin = useRef<{ id: string; moved: boolean; sx: number; sy: number } | null>(null);

  const size = useCallback(() => {
    const r = viewportRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1, left: r?.left ?? 0, top: r?.top ?? 0 };
  }, []);

  function onImgLoad(img: HTMLImageElement) {
    if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
  }
  useEffect(() => {
    if (imgRef.current?.complete) onImgLoad(imgRef.current);
  }, []);

  // Mausrad / Trackpad-Pinch: Zoom um den Zeiger. Muss ein nicht-passiver Listener sein, damit die Seite nicht mitscrollt.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = size();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setView((v) => zoomAround(v, factor, e.clientX - s.left, e.clientY - s.top, s.w, s.h));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [size]);

  // Vom Link „Auf der Karte“ kommend: Pin auswählen und heranzoomen.
  useEffect(() => {
    if (!initialPinId) return;
    const pin = initialPins.find((p) => p.id === initialPinId);
    if (!pin) return;
    const frame = requestAnimationFrame(() => {
      const s = size();
      setView(viewCenteredOn(pin.x, pin.y, 2.5, s.w, s.h));
    });
    return () => cancelAnimationFrame(frame);
  }, [initialPinId, initialPins, size]);

  const selected = pins.find((p) => p.id === selectedId) ?? null;

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as Element).closest("[data-pin]")) return;
    viewportRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = size();
    if (pointers.current.size === 1) {
      gesture.current = { kind: "pan", sx: e.clientX, sy: e.clientY, start: view, moved: false, dist: 0, mx: 0, my: 0 };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: "pinch",
        sx: 0,
        sy: 0,
        start: view,
        moved: true,
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: (a.x + b.x) / 2 - s.left,
        my: (a.y + b.y) / 2 - s.top,
      };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragPin.current) return;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const s = size();
    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2 - s.left;
      const my = (a.y + b.y) / 2 - s.top;
      const zoomed = zoomAround(g.start, dist / g.dist, g.mx, g.my, s.w, s.h);
      setView(clampView({ scale: zoomed.scale, tx: zoomed.tx + (mx - g.mx), ty: zoomed.ty + (my - g.my) }, s.w, s.h));
    } else if (g.kind === "pan") {
      const dx = e.clientX - g.sx;
      const dy = e.clientY - g.sy;
      if (!g.moved && Math.hypot(dx, dy) > 4) g.moved = true;
      if (g.moved) setView(clampView({ scale: g.start.scale, tx: g.start.tx + dx, ty: g.start.ty + dy }, s.w, s.h));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    const known = pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && g?.kind === "pinch") gesture.current = null;
    if (!known || !g || g.kind !== "pan") return;
    gesture.current = null;
    if (g.moved) return;
    // Ein Tippen auf die freie Karte: im Bearbeiten-Modus neuer Pin, sonst Auswahl aufheben.
    if (editing && innerRef.current) {
      const p = pointToPercent(innerRef.current.getBoundingClientRect(), e.clientX, e.clientY);
      setSelectedId(null);
      setDraft({ ...p, label: "", icon: "", pageId: "", targetMapId: "" });
      setPickerOpen(false);
    } else {
      setSelectedId(null);
    }
  }

  // Pins: Tippen wählt aus; im Bearbeiten-Modus lässt sich der Pin ziehen.
  function onPinDown(e: React.PointerEvent, pin: WikiMapPin) {
    e.stopPropagation();
    if (!editing) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragPin.current = { id: pin.id, moved: false, sx: e.clientX, sy: e.clientY };
  }
  function onPinMove(e: React.PointerEvent, pin: WikiMapPin) {
    const d = dragPin.current;
    if (!d || d.id !== pin.id || !innerRef.current) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    if (!d.moved) return;
    const p = pointToPercent(innerRef.current.getBoundingClientRect(), e.clientX, e.clientY);
    setPins((cur) => cur.map((x) => (x.id === pin.id ? { ...x, ...p } : x)));
  }
  async function onPinUp(e: React.PointerEvent, pin: WikiMapPin) {
    const d = dragPin.current;
    dragPin.current = null;
    if (!d || d.id !== pin.id) return;
    if (!d.moved) return select(pin);
    const now = pins.find((x) => x.id === pin.id);
    if (!now) return;
    const before = initialPins.find((x) => x.id === pin.id);
    const res = await movePin(pin.id, now.x, now.y);
    if (!res.ok) {
      setError(res.error);
      if (before) setPins((cur) => cur.map((x) => (x.id === pin.id ? { ...x, x: before.x, y: before.y } : x)));
    }
  }

  function select(pin: WikiMapPin) {
    setError(null);
    setSelectedId(pin.id);
    setDraft(
      editing
        ? { id: pin.id, x: pin.x, y: pin.y, label: pin.label, icon: pin.icon ?? "", pageId: pin.page_id ?? "", targetMapId: pin.target_map_id ?? "" }
        : null,
    );
    setPickerOpen(false);
  }

  function toggleEditing() {
    setEditing((v) => !v);
    setDraft(null);
    setSelectedId(null);
    setError(null);
  }

  async function savePin() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const raw = { label: draft.label, icon: draft.icon, pageId: draft.pageId, targetMapId: draft.targetMapId };
    if (draft.id) {
      const res = await updatePin(draft.id, raw);
      if (!res.ok) setError(res.error);
      else {
        setPins((cur) => cur.map((p) => (p.id === res.pin.id ? { ...res.pin, x: p.x, y: p.y } : p)));
        setDraft(null);
        setSelectedId(null);
      }
    } else {
      const res = await addMapPin(map.id, draft.x, draft.y, raw);
      if (!res.ok) setError(res.error);
      else {
        setPins((cur) => [...cur, res.pin]);
        setDraft(null);
        setSelectedId(res.pin.id);
      }
    }
    setBusy(false);
  }

  async function removePin() {
    if (!draft?.id) return;
    setBusy(true);
    const res = await deletePin(draft.id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setPins((cur) => cur.filter((p) => p.id !== draft.id));
    setDraft(null);
    setSelectedId(null);
  }

  const zoomBy = (factor: number) => {
    const s = size();
    setView((v) => zoomAround(v, factor, s.w / 2, s.h / 2, s.w, s.h));
  };
  const pageTitle = (id: string | null) => pages.find((p) => p.id === id)?.title;
  const mapTitle = (id: string | null) => otherMaps.find((m) => m.id === id)?.title;
  const markers = draft && !draft.id ? [...pins, { id: "__neu", map_id: map.id, x: draft.x, y: draft.y, label: draft.label || "Neu", icon: draft.icon || null, page_id: null, target_map_id: null }] : pins;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleEditing}
          aria-pressed={editing}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${editing ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          {editing ? "Fertig" : "Pins bearbeiten"}
        </button>
        <div className="flex gap-1.5" role="group" aria-label="Zoom">
          <button type="button" className={btn} onClick={() => zoomBy(1.5)} aria-label="Vergrößern" disabled={view.scale >= 8}>
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" className={btn} onClick={() => zoomBy(1 / 1.5)} aria-label="Verkleinern" disabled={view.scale <= 1}>
            <Minus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" className={btn} onClick={() => setView({ scale: 1, tx: 0, ty: 0 })} aria-label="Ansicht zurücksetzen">
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      {editing && <p className="text-sm text-muted">Tippe auf die Karte, um einen Pin zu setzen. Pins lassen sich mit gedrückter Maustaste oder dem Finger verschieben.</p>}

      <div
        ref={viewportRef}
        data-testid="map-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative w-full touch-none select-none overflow-hidden rounded-2xl border border-line bg-surface-2 ${editing ? "cursor-crosshair" : "cursor-grab"}`}
        style={{ aspectRatio: String(ratio) }}
      >
        <div ref={innerRef} data-testid="map-inner" className="absolute inset-0 origin-top-left" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={map.image_url} alt={map.title} draggable={false} onLoad={(e) => onImgLoad(e.currentTarget)} className="h-full w-full" />
          {markers.map((pin) => {
            const active = pin.id === selectedId || pin.id === "__neu";
            return (
              <button
                key={pin.id}
                type="button"
                data-pin={pin.id}
                aria-label={`Pin: ${pin.label}`}
                onPointerDown={(e) => onPinDown(e, pin)}
                onPointerMove={(e) => onPinMove(e, pin)}
                onPointerUp={(e) => onPinUp(e, pin)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!editing && pin.id !== "__neu") select(pin);
                }}
                className={`absolute flex flex-col items-center ${active ? "z-20" : "z-10"} ${editing ? "cursor-move" : "cursor-pointer"}`}
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: `translate(-50%, -100%) scale(${1 / view.scale})`, transformOrigin: "50% 100%" }}
              >
                {(active || view.scale >= 2) && (
                  <span className="mb-1 max-w-40 truncate rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-fg shadow ring-1 ring-line">{pin.label}</span>
                )}
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface text-base shadow-md ${active ? "bg-accent-strong text-on-accent-strong" : "bg-accent text-on-accent-strong"}`}
                >
                  {pin.icon ? pin.icon : <MapPin className="h-4 w-4" strokeWidth={2.25} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {draft && editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void savePin();
          }}
          className="relative flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
          aria-label={draft.id ? "Pin bearbeiten" : "Neuer Pin"}
        >
          <h2 className="font-serif text-xl text-fg">{draft.id ? "Pin bearbeiten" : "Neuer Pin"}</h2>
          <div className="grid gap-3 @xl:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Name
              <input autoFocus required maxLength={80} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={field} placeholder="z. B. Nebelhafen" />
            </label>
            <div className="flex flex-col gap-1 text-xs text-muted">
              Symbol
              <button type="button" onClick={() => setPickerOpen((v) => !v)} className={`${field} min-w-16 text-center`} aria-label="Symbol wählen">
                {draft.icon || "Standard"}
              </button>
            </div>
          </div>
          {pickerOpen && (
            <div className="absolute right-4 top-24 z-30">
              <SymbolPicker onPick={(s) => { setDraft({ ...draft, icon: s }); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
            </div>
          )}
          <div className="grid gap-3 @xl:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Führt zur Wiki-Seite
              <select value={draft.pageId} onChange={(e) => setDraft({ ...draft, pageId: e.target.value })} className={field}>
                <option value="">Keine</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Führt zur Karte
              <select value={draft.targetMapId} onChange={(e) => setDraft({ ...draft, targetMapId: e.target.value })} className={field}>
                <option value="">Keine</option>
                {otherMaps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
              {busy ? "Speichere …" : "Speichern"}
            </button>
            <button type="button" onClick={() => { setDraft(null); setSelectedId(null); }} className="text-sm text-muted hover:text-fg">
              Abbrechen
            </button>
            {draft.id && (
              <button type="button" onClick={() => void removePin()} disabled={busy} className="ml-auto flex items-center gap-1.5 text-sm text-red-600 hover:underline dark:text-red-400">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Pin entfernen
              </button>
            )}
          </div>
        </form>
      ) : selected && !editing ? (
        <section aria-label="Pin" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 font-serif text-xl text-fg">
            <span aria-hidden>{selected.icon || <MapPin className="inline h-5 w-5" strokeWidth={2} />}</span>
            {selected.label}
          </h2>
          {!selected.page_id && !selected.target_map_id && <p className="text-sm text-muted">Dieser Pin führt nirgendwohin.</p>}
          <div className="flex flex-wrap gap-2">
            {selected.page_id && (
              <Link href={`/wiki/${selected.page_id}`} className="rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
                Zur Seite „{pageTitle(selected.page_id) ?? "Wiki"}“
              </Link>
            )}
            {selected.target_map_id && (
              <Link href={`/wiki/karten/${selected.target_map_id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent">
                Zur Karte „{mapTitle(selected.target_map_id) ?? "Karte"}“
              </Link>
            )}
          </div>
        </section>
      ) : (
        !editing && pins.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Alle Pins">
            {pins.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { select(p); const s = size(); setView(viewCenteredOn(p.x, p.y, Math.max(view.scale, 2.5), s.w, s.h)); }} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent">
                  {p.icon ? `${p.icon} ` : ""}
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        )
      )}

    </div>
  );
}
