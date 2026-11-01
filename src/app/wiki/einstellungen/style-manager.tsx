"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWikiStyle } from "../home-actions";
import {
  DEFAULT_WIKI_STYLE, WIKI_ACCENTS, WIKI_CARDS, WIKI_FONTS, WIKI_RADII, WIKI_WIDTHS, isDefaultWikiStyle, wikiStyleProps, type WikiStyle,
} from "@/lib/wiki-style";

const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
      <span>{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// Wiki-Design der Welt: Akzentfarbe, Überschriftenschrift, Karten, Ecken, Textbreite, Tönung – mit Vorschau.
export function StyleManager({ worldId, initial }: { worldId: string; initial: WikiStyle | null }) {
  const router = useRouter();
  const [style, setStyle] = useState<WikiStyle>(initial ?? DEFAULT_WIKI_STYLE);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<WikiStyle>) => {
    setStyle((s) => ({ ...s, ...patch }));
    setMessage(null);
  };
  const preview = wikiStyleProps(isDefaultWikiStyle(style) ? null : style);

  function save(next: WikiStyle) {
    setMessage(null);
    startTransition(async () => {
      const error = await saveWikiStyle(worldId, JSON.stringify(next));
      if (error) {
        setMessage({ ok: false, text: error });
        return;
      }
      setMessage({ ok: true, text: "Gespeichert." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Row label="Akzentfarbe">
        <button type="button" onClick={() => set({ accent: null })} aria-pressed={style.accent === null} className={pill(style.accent === null)}>
          Standard
        </button>
        {WIKI_ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => set({ accent: a.id })}
            aria-pressed={style.accent === a.id}
            aria-label={a.label}
            title={a.label}
            className={`h-8 w-8 rounded-full border-2 ${style.accent === a.id ? "border-fg ring-2 ring-accent/40" : "border-transparent"}`}
            style={{ backgroundColor: a.light }}
          />
        ))}
      </Row>
      <Row label="Überschriften">
        <button type="button" onClick={() => set({ font: null })} aria-pressed={style.font === null} className={pill(style.font === null)}>
          Standard
        </button>
        {WIKI_FONTS.map((f) => (
          <button key={f.id} type="button" onClick={() => set({ font: f.id })} aria-pressed={style.font === f.id} className={pill(style.font === f.id)} style={{ fontFamily: f.css }}>
            {f.label}
          </button>
        ))}
      </Row>
      <Row label="Karten">
        {WIKI_CARDS.map((c) => (
          <button key={c.id} type="button" onClick={() => set({ cards: c.id })} aria-pressed={style.cards === c.id} className={pill(style.cards === c.id)}>
            {c.label}
          </button>
        ))}
      </Row>
      {style.cards === "soft" && (
        <Row label="Tönung der Karten">
          <button type="button" onClick={() => set({ tint: null })} aria-pressed={style.tint === null} className={pill(style.tint === null)}>
            Keine
          </button>
          {WIKI_ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => set({ tint: a.id })}
              aria-pressed={style.tint === a.id}
              aria-label={a.label}
              title={a.label}
              className={`h-8 w-8 rounded-full border-2 ${style.tint === a.id ? "border-fg ring-2 ring-accent/40" : "border-transparent"}`}
              style={{ backgroundColor: `color-mix(in srgb, ${a.light} 30%, white)` }}
            />
          ))}
        </Row>
      )}
      <Row label="Ecken">
        {WIKI_RADII.map((r) => (
          <button key={r.id} type="button" onClick={() => set({ radius: r.id })} aria-pressed={style.radius === r.id} className={pill(style.radius === r.id)}>
            {r.label}
          </button>
        ))}
      </Row>
      <Row label="Breite des Textes">
        {WIKI_WIDTHS.map((w) => (
          <button key={w.id} type="button" onClick={() => set({ width: w.id })} aria-pressed={style.width === w.id} className={pill(style.width === w.id)}>
            {w.label}
          </button>
        ))}
      </Row>

      <div className="wiki-styled rounded-2xl border border-dashed border-line p-4" style={preview.style} {...preview.data} aria-label="Vorschau">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="font-serif text-2xl text-fg">Die Nebelglocke</h3>
          <div className="wiki-prose mt-2 !text-base">
            <p>Seit drei Jahrhunderten läutet sie bei Nebel. Mehr dazu bei den <span className="text-accent underline underline-offset-2">Lotsen</span>.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-fg-soft">Ort</span>
            <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-fg-soft">Hafen</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => save(style)}
          disabled={pending}
          className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichern …" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStyle(DEFAULT_WIKI_STYLE);
            save(DEFAULT_WIKI_STYLE);
          }}
          disabled={pending}
          className="rounded-lg px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2 disabled:opacity-50"
        >
          Zurücksetzen
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
