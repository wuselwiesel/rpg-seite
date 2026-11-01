"use client";

import { useState } from "react";
import { DEFAULT_TOC, TOC_TITLE, headingsOfHtml, isDefaultToc, tocKey, type WikiToc } from "@/lib/wiki-toc";

const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`;

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
      <span id={`toc-${label}`}>{label}</span>
      <div role="radiogroup" aria-labelledby={`toc-${label}`} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={String(o.id)} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={pill(value === o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Inhaltsverzeichnis der Seite einstellen: Anzeige, Ebenen, Ort, Nummerierung, Titel und welche Überschriften erscheinen.
// Gespeichert wird nur, wenn etwas geändert wurde oder die Seite schon eine eigene Einstellung hat (Feld „toc“).
export function TocSettings({ initial, bodyHtml }: { initial: WikiToc | null; bodyHtml: string }) {
  const [toc, setToc] = useState<WikiToc>(initial ?? DEFAULT_TOC);
  const [touched, setTouched] = useState(false);
  const found = headingsOfHtml(bodyHtml);
  const headings = found.filter((h, i) => found.findIndex((o) => tocKey(o.text) === tocKey(h.text)) === i);
  const present = new Set(headings.map((h) => tocKey(h.text)));
  const hidden = new Set(toc.hidden.map(tocKey));

  function change(patch: Partial<WikiToc>) {
    setToc((t) => ({ ...t, ...patch }));
    setTouched(true);
  }

  function toggle(text: string, show: boolean) {
    const rest = toc.hidden.filter((h) => tocKey(h) !== tocKey(text));
    change({ hidden: show ? rest : [...rest, text] });
  }

  const save = touched || initial !== null;
  const cleaned: WikiToc = { ...toc, hidden: toc.hidden.filter((h) => present.has(tocKey(h))) };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      {save && (
        <>
          <input type="hidden" name="toc_present" value="1" />
          <input type="hidden" name="toc" value={isDefaultToc(cleaned) ? "" : JSON.stringify(cleaned)} />
        </>
      )}
      <h2 className="font-serif text-xl text-fg">Inhaltsverzeichnis</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice label="Anzeige" value={toc.mode} onChange={(mode) => change({ mode })} options={[{ id: "auto", label: "Automatisch" }, { id: "off", label: "Aus" }]} />
        {toc.mode === "auto" && (
          <>
            <Choice label="Ebenen" value={toc.levels} onChange={(levels) => change({ levels })} options={[{ id: 2, label: "Hauptüberschriften" }, { id: 3, label: "Mit Unterüberschriften" }]} />
            <Choice label="Ort" value={toc.position} onChange={(position) => change({ position })} options={[{ id: "side", label: "Seitlich" }, { id: "top", label: "Über dem Text" }]} />
            <label className="flex items-center gap-2 text-sm text-fg-soft sm:self-end sm:pb-2">
              <input type="checkbox" checked={toc.numbered} onChange={(e) => change({ numbered: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Nummerieren
            </label>
          </>
        )}
      </div>
      {toc.mode === "auto" && (
        <>
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Titel
            <input
              value={toc.title}
              maxLength={40}
              onChange={(e) => change({ title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder={TOC_TITLE}
              className="rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent"
            />
          </label>
          <fieldset className="flex flex-col gap-1.5 text-sm text-fg-soft">
            <legend className="mb-1">Überschriften</legend>
            {headings.length === 0 ? (
              <p className="text-muted">Noch keine Überschriften im Text.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {headings.map((h) => {
                  const off = toc.levels === 2 && h.level === 3;
                  return (
                    <li key={tocKey(h.text)} className={h.level === 3 ? "pl-5" : ""}>
                      <label className={`flex items-center gap-2 ${off ? "opacity-50" : ""}`}>
                        <input type="checkbox" checked={!off && !hidden.has(tocKey(h.text))} disabled={off} onChange={(e) => toggle(h.text, e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                        <span className="min-w-0 truncate text-fg">{h.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        </>
      )}
    </section>
  );
}
