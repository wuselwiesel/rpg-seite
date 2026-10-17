"use client";

import { useState } from "react";
import { Search } from "lucide-react";

// Suche in der Hilfe: blendet Absätze und Punkte aus, die den Suchbegriff nicht enthalten, und Abschnitte ohne Treffer ganz
export function HelpSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<number | null>(null);

  function filter(value: string) {
    setQuery(value);
    const q = value.trim().toLocaleLowerCase("de");
    const sections = document.querySelectorAll<HTMLElement>("[data-help-section]");
    let total = 0;
    sections.forEach((section) => {
      const items = section.querySelectorAll<HTMLElement>("li, :scope > p");
      const heading = (section.querySelector("h2")?.textContent ?? "").toLocaleLowerCase("de");
      let shown = 0;
      items.forEach((el) => {
        const match = !q || (el.textContent ?? "").toLocaleLowerCase("de").includes(q);
        // verschachtelte Listen: ein Treffer im inneren Punkt zeigt auch den äußeren
        el.hidden = !match;
        if (match) shown += 1;
      });
      const headingMatch = q !== "" && heading.includes(q);
      if (headingMatch) items.forEach((el) => (el.hidden = false));
      const visible = !q || shown > 0 || headingMatch;
      section.hidden = !visible;
      if (q && visible) total += headingMatch && shown === 0 ? items.length : shown;
    });
    setHits(q ? total : null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
        <input
          type="search"
          value={query}
          onChange={(e) => filter(e.target.value)}
          placeholder="In der Hilfe suchen"
          aria-label="In der Hilfe suchen"
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      {hits === 0 && <p className="text-sm text-muted">Nichts gefunden.</p>}
    </div>
  );
}
