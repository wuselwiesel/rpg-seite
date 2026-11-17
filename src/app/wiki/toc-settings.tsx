"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { DEFAULT_TOC, TOC_TITLE, headingsOfHtml, isDefaultToc, keyedHeadings, tocDefaultsOnly, tocKey, type WikiToc } from "@/lib/wiki-toc";

const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`;
const field = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";

function Choice<T extends string | number>({ label, value, options, onChange, idPrefix }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; idPrefix: string }) {
  const id = `${idPrefix}-${label}`;
  return (
    <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
      <span id={id}>{label}</span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={pill(value === o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Die allgemeinen Einstellungen: Anzeige, Ebenen, Ort, Nummerierung, Titel (und auf Wunsch „erst ab N Überschriften“). Gelten für Seite, Art und Welt.
function BasicControls({ toc, change, idPrefix, withMin }: { toc: WikiToc; change: (patch: Partial<WikiToc>) => void; idPrefix: string; withMin: boolean }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice idPrefix={idPrefix} label="Anzeige" value={toc.mode} onChange={(mode) => change({ mode })} options={[{ id: "auto", label: "Automatisch" }, { id: "off", label: "Aus" }]} />
        {toc.mode === "auto" && (
          <>
            <Choice idPrefix={idPrefix} label="Ebenen" value={toc.levels} onChange={(levels) => change({ levels })} options={[{ id: 2, label: "Hauptüberschriften" }, { id: 3, label: "Mit Unterüberschriften" }]} />
            <Choice idPrefix={idPrefix} label="Ort" value={toc.position} onChange={(position) => change({ position })} options={[{ id: "side", label: "Seitlich" }, { id: "top", label: "Über dem Text" }]} />
            <label className="flex items-center gap-2 text-sm text-fg-soft sm:self-end sm:pb-2">
              <input type="checkbox" checked={toc.numbered} onChange={(e) => change({ numbered: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Nummerieren
            </label>
          </>
        )}
      </div>
      {toc.mode === "auto" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Titel
            <input value={toc.title} maxLength={40} onChange={(e) => change({ title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} placeholder={TOC_TITLE} className={field} />
          </label>
          {withMin && (
            <label className="flex flex-col gap-1 text-sm text-fg-soft">
              Erst ab so vielen Überschriften zeigen
              <select value={toc.minHeadings} onChange={(e) => change({ minHeadings: Number(e.target.value) })} className={field}>
                <option value={0}>Immer</option>
                {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    ab {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </>
  );
}

// Standard-Verzeichnis für die ganze Welt oder eine Art: nur die allgemeinen Einstellungen (Ausblenden, eigene Namen, Reihenfolge und eigene Einträge
// gehören zur einzelnen Seite). Meldet jede Änderung nach oben; „Kein Standard“ (null) = es gilt das fest eingebaute Verhalten bzw. der nächste Standard.
export function TocDefaultEditor({ value, onChange, idPrefix = "tocd" }: { value: WikiToc | null; onChange: (toc: WikiToc | null) => void; idPrefix?: string }) {
  const toc = value ?? DEFAULT_TOC;
  const set = (patch: Partial<WikiToc>) => onChange(tocDefaultsOnly({ ...toc, ...patch }));
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-fg-soft">
        <input type="checkbox" checked={value !== null} onChange={(e) => onChange(e.target.checked ? { ...DEFAULT_TOC, minHeadings: 3 } : null)} className="h-4 w-4 accent-[var(--accent)]" />
        Eigenen Standard festlegen
      </label>
      {value !== null && <BasicControls toc={toc} change={set} idPrefix={idPrefix} withMin />}
    </div>
  );
}

type Row = { key: string; text: string; level?: 2 | 3; extraId?: string };

// Inhaltsverzeichnis der Seite einstellen: Standard (der Art oder Welt) oder eigene Einstellung mit Anzeige, Ebenen, Ort, Nummerierung, Titel, welche Überschriften
// erscheinen, eigenen Namen, Reihenfolge und eigenen Einträgen. Gespeichert wird nur, wenn etwas geändert wurde oder die Seite schon eine eigene Einstellung hat (Feld „toc“).
export function TocSettings({ initial, bodyHtml, inherited, pages }: { initial: WikiToc | null; bodyHtml: string; inherited: WikiToc | null; pages: { id: string; title: string }[] }) {
  const [own, setOwn] = useState(initial !== null);
  const [toc, setToc] = useState<WikiToc>(initial ?? inherited ?? DEFAULT_TOC);
  const [touched, setTouched] = useState(false);
  const [extraPage, setExtraPage] = useState("");
  const [extraLabel, setExtraLabel] = useState("");
  const found = headingsOfHtml(bodyHtml);
  const keyed = keyedHeadings(found);
  const present = new Set(keyed.map((h) => h.key));
  const hidden = new Set(toc.hidden.map(tocKey));

  // Wird eine Überschrift umbenannt (gleiche Zahl, nur der Text an einer Stelle anders), wandern Ausblenden, Name und Reihenfolge mit
  const prevKeys = useRef<string[] | null>(null);
  const keySig = keyed.map((h) => h.key).join("\n");
  useEffect(() => {
    const keys = keyed.map((h) => h.key);
    const prev = prevKeys.current;
    prevKeys.current = keys;
    if (!prev || prev.length !== keys.length) return;
    const moved = new Map<string, string>();
    prev.forEach((k, i) => {
      if (k !== keys[i] && !keys.includes(k)) moved.set(k, keys[i]);
    });
    if (moved.size === 0) return;
    const swap = (k: string) => moved.get(tocKey(k)) ?? k;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reaktion auf die Eingabe im Editor-Text
    setToc((t) => ({
      ...t,
      hidden: t.hidden.map(swap),
      order: t.order.map(swap),
      labels: Object.fromEntries(Object.entries(t.labels).map(([k, v]) => [swap(k), v])),
    }));
    setTouched(true);
    // keySig bündelt die Überschriften-Schlüssel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig]);

  function change(patch: Partial<WikiToc>) {
    setToc((t) => ({ ...t, ...patch }));
    setTouched(true);
    setOwn(true);
  }

  function toggle(key: string, show: boolean) {
    const rest = toc.hidden.filter((h) => tocKey(h) !== tocKey(key));
    change({ hidden: show ? rest : [...rest, key] });
  }

  function setLabel(key: string, value: string) {
    const labels = { ...toc.labels };
    if (value.trim()) labels[key] = value.slice(0, 60);
    else delete labels[key];
    change({ labels });
  }

  const baseRows: Row[] = [
    ...keyed.map((h) => ({ key: h.key, text: h.text, level: h.level })),
    ...toc.extra.map((e) => ({ key: `x:${e.id}`, text: e.label, extraId: e.id })),
  ];
  const pos = new Map(toc.order.map((k, i) => [k, i]));
  const rows = toc.order.length ? baseRows.map((r, i) => ({ r, i })).sort((a, b) => (pos.get(a.r.key) ?? 1e6 + a.i) - (pos.get(b.r.key) ?? 1e6 + b.i)).map((x) => x.r) : baseRows;

  function move(key: string, dir: -1 | 1) {
    const keys = rows.map((r) => r.key);
    const i = keys.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    change({ order: keys });
  }

  function addExtra() {
    const page = pages.find((p) => p.id === extraPage);
    if (!page || toc.extra.length >= 20) return;
    const id = Math.random().toString(36).slice(2, 8);
    change({ extra: [...toc.extra, { id, label: (extraLabel.trim() || page.title).slice(0, 60), pageId: page.id }] });
    setExtraPage("");
    setExtraLabel("");
  }

  function removeExtra(id: string) {
    change({ extra: toc.extra.filter((e) => e.id !== id), order: toc.order.filter((k) => k !== `x:${id}`) });
  }

  // Beim Speichern nur Einträge behalten, die es noch gibt
  const cleaned: WikiToc = {
    ...toc,
    hidden: toc.hidden.filter((h) => present.has(tocKey(h))),
    labels: Object.fromEntries(Object.entries(toc.labels).filter(([k]) => present.has(k))),
    order: toc.order.filter((k) => present.has(k) || toc.extra.some((e) => `x:${e.id}` === k)),
  };
  const save = touched || initial !== null;
  // Eigene Einstellung = Standard und es gibt keinen anderen Standard: nichts speichern (dann gilt das fest eingebaute Verhalten)
  const value = !own ? "" : isDefaultToc(cleaned) && inherited === null ? "" : JSON.stringify(cleaned);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      {save && (
        <>
          <input type="hidden" name="toc_present" value="1" />
          <input type="hidden" name="toc" value={value} />
        </>
      )}
      <h2 className="font-serif text-xl text-fg">Inhaltsverzeichnis</h2>

      <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
        <span>Welche Einstellung gilt?</span>
        <div role="radiogroup" aria-label="Welche Einstellung gilt" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={!own}
            onClick={() => {
              setOwn(false);
              setTouched(true);
            }}
            className={pill(!own)}
          >
            Standard {inherited ? "(von Art oder Welt)" : "(Verzeichnis ab drei Überschriften)"}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={own}
            onClick={() => {
              setOwn(true);
              setTouched(true);
              if (initial === null && !touched) setToc(inherited ?? DEFAULT_TOC);
            }}
            className={pill(own)}
          >
            Für diese Seite einstellen
          </button>
        </div>
      </div>

      {own && (
        <>
          <BasicControls toc={toc} change={change} idPrefix="toc" withMin={false} />
          {toc.mode === "auto" && (
            <fieldset className="flex flex-col gap-1.5 text-sm text-fg-soft">
              <legend className="mb-1">Einträge: Häkchen = im Verzeichnis, Name ändern, mit den Pfeilen verschieben</legend>
              {rows.length === 0 ? (
                <p className="text-muted">Noch keine Überschriften im Text.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {rows.map((r, i) => {
                    const off = r.level === 3 && toc.levels === 2;
                    return (
                      <li key={r.key} className={`flex items-center gap-2 ${r.level === 3 ? "pl-5" : ""} ${off ? "opacity-50" : ""}`}>
                        {r.extraId ? (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs text-muted" title="Eigener Eintrag mit Link auf eine andere Seite" aria-hidden>
                            ↗
                          </span>
                        ) : (
                          <input type="checkbox" checked={!off && !hidden.has(tocKey(r.key))} disabled={off} onChange={(e) => toggle(r.key, e.target.checked)} aria-label={`„${r.text}“ im Verzeichnis zeigen`} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                        )}
                        <input
                          value={r.extraId ? r.text : (toc.labels[r.key] ?? "")}
                          maxLength={60}
                          placeholder={r.text}
                          aria-label={`Name im Verzeichnis für „${r.text}“`}
                          onChange={(e) => (r.extraId ? change({ extra: toc.extra.map((x) => (x.id === r.extraId ? { ...x, label: e.target.value.slice(0, 60) } : x)) }) : setLabel(r.key, e.target.value))}
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                          className="min-w-0 flex-1 rounded-md border border-line bg-app px-2 py-1 text-sm text-fg outline-none focus:border-accent"
                        />
                        <button type="button" onClick={() => move(r.key, -1)} disabled={i === 0} aria-label="Nach oben" className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button type="button" onClick={() => move(r.key, 1)} disabled={i === rows.length - 1} aria-label="Nach unten" className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        {r.extraId && (
                          <button type="button" onClick={() => removeExtra(r.extraId!)} aria-label="Eintrag entfernen" className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-red-600">
                            <X className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {pages.length > 0 && toc.extra.length < 20 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="w-full text-fg">Eigenen Eintrag mit Link auf eine andere Seite hinzufügen</span>
                  <select value={extraPage} onChange={(e) => setExtraPage(e.target.value)} aria-label="Seite für den Eintrag" className="min-w-0 flex-[2_1_12rem] rounded-md border border-line bg-app px-2 py-1.5 text-sm text-fg outline-none focus:border-accent">
                    <option value="">Seite wählen …</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <input
                    value={extraLabel}
                    maxLength={60}
                    onChange={(e) => setExtraLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder="Name (sonst Titel der Seite)"
                    aria-label="Name des eigenen Eintrags"
                    className="min-w-0 flex-[1_1_9rem] rounded-md border border-line bg-app px-2 py-1.5 text-sm text-fg outline-none focus:border-accent"
                  />
                  <button type="button" onClick={addExtra} disabled={!extraPage} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                    Hinzufügen
                  </button>
                </div>
              )}
            </fieldset>
          )}
        </>
      )}
    </section>
  );
}
