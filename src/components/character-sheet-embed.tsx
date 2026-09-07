"use client";

import { useEffect, useState } from "react";
import {
  parseSheetUrl,
  fetchPublicSheet,
  type CharakterbogenCharacter,
} from "@/lib/charakterbogen";
import { ATTR_TABLE, TALENT_LIST, talentSlug, num } from "@/lib/charakterbogen-stats";

// Dynamisch importiert (nie statisch), damit dieses clientseitige Modul nicht
// beim serverseitigen Rendern der Seite mitgeladen wird - DOMPurify braucht
// ein echtes DOM und darf im SSR-Bundle nicht ausgewertet werden.
async function sanitizeNotesHtml(html: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3",
      "ul", "ol", "li", "hr", "span", "font", "table", "thead", "tbody", "tr", "td", "th", "img",
    ],
    ALLOWED_ATTR: ["style", "src", "alt", "href", "target", "rel", "color", "size", "face"],
  });
}

type Status = "loading" | "not-found" | "error" | "ready";

export function CharacterSheetEmbed({ sheetUrl }: { sheetUrl: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [sheet, setSheet] = useState<CharakterbogenCharacter | null>(null);
  const [notesHtml, setNotesHtml] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ref = parseSheetUrl(sheetUrl);
    const run = ref ? fetchPublicSheet(ref) : Promise.resolve(null);

    run
      .then(async (result) => {
        if (cancelled) return;
        if (!ref || !result) {
          setStatus("not-found");
          return;
        }
        const blocks = result.data.notesBlocks ?? [];
        const sanitized = await Promise.all(blocks.map((b) => sanitizeNotesHtml(b.html ?? "")));
        if (cancelled) return;
        setSheet(result);
        setNotesHtml(sanitized);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [sheetUrl]);

  if (status === "loading") {
    return <p className="text-sm text-muted">Lade Charakterbogen...</p>;
  }

  if (status === "not-found") {
    return (
      <p className="text-sm text-muted">
        Dieser Charakterbogen ist nicht (mehr) öffentlich freigegeben.{" "}
        <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          In Charakterbogen öffnen
        </a>
      </p>
    );
  }

  if (status === "error" || !sheet) {
    return (
      <p className="text-sm text-muted">
        Charakterbogen konnte gerade nicht geladen werden.{" "}
        <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          Direkt öffnen
        </a>
      </p>
    );
  }

  const d = sheet.data;

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl text-fg">{sheet.name}</h3>
          <p className="text-xs text-muted">
            {[d.race && d.race !== "none" ? d.race : null, d.universe].filter(Boolean).join(" · ")}
          </p>
        </div>
        <a
          href={sheetUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm text-accent hover:underline"
        >
          In Charakterbogen öffnen
        </a>
      </div>

      {d.personalFields && d.personalFields.some((f) => f.value) && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {d.personalFields
            .filter((f) => f.value)
            .map((f, i) => (
              <div key={i} className="contents">
                <dt className="text-muted">{f.label}</dt>
                <dd className="text-fg-soft">{f.value}</dd>
              </div>
            ))}
        </dl>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Attribute</p>
        <div className="grid grid-cols-5 gap-2">
          {ATTR_TABLE.map((a) => (
            <div key={a.code} className="rounded-lg bg-surface-2 px-2 py-2 text-center" title={a.name}>
              <p className="text-xs text-muted">{a.code}</p>
              <p className="font-serif text-lg text-fg">
                {num(d.attrBasis?.[a.code]) + num(d.attrBonus?.[a.code])}
              </p>
            </div>
          ))}
        </div>
      </div>

      <details>
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted">
          Talente
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {TALENT_LIST.map((name) => {
            const tid = talentSlug(name);
            const total = num(d.talentBasis?.[tid]) + num(d.talentBonus?.[tid]);
            return (
              <div key={tid} className="flex justify-between gap-2 text-fg-soft">
                <span className="truncate">{name}</span>
                <span className="text-fg">{total}</span>
              </div>
            );
          })}
        </div>
      </details>

      {d.notesBlocks && d.notesBlocks.some((b) => b.html?.trim()) && (
        <details>
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted">
            Notizen
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            {d.notesBlocks.map((b, i) =>
              b.html?.trim() ? (
                <div key={i}>
                  <p className="mb-1 text-xs font-medium text-muted">{b.label}</p>
                  <div
                    className="post-content text-sm text-fg-soft"
                    dangerouslySetInnerHTML={{ __html: notesHtml[i] ?? "" }}
                  />
                </div>
              ) : null,
            )}
          </div>
        </details>
      )}
    </div>
  );
}
