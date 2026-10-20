import sanitizeHtml from "sanitize-html";

// Kern der HTML-Bereinigung für Beiträge, Szenen und Wiki-Texte (ohne server-only, damit er sich testen lässt;
// benutzt wird er über sanitize.ts). Textbausteine des Wiki-Editors: Hinweis-Kasten (div[data-callout]),
// Spoiler (details/summary mit div[data-type=detailsContent]) und Tabellen.

import { CALLOUT_KINDS } from "@/lib/callout-kinds";

export { CALLOUT_KINDS };

const clampSpan = (value: string | undefined): string | undefined => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 1 && n <= 20 ? String(n) : undefined;
};

export function sanitizePostHtmlCore(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "hr",
      "span",
      "div",
      "details",
      "summary",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      // Notizen: Code und Aufgabenlisten
      "pre",
      "code",
      "label",
      "input",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "loading", "decoding"],
      span: ["data-type", "data-id", "class", "style"],
      div: ["data-callout", "data-type", "data-id", "data-name", "data-pdf"],
      details: ["open"],
      ul: ["data-type"],
      li: ["data-type", "data-checked"],
      input: ["type", "checked", "disabled"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Bilder in Texten erst laden, wenn sie in die Nähe kommen (lange Szenen und Seiten)
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
      // Nur die bekannten Hinweis-Arten und der Spoiler-Inhalt behalten ihre Kennzeichnung; jedes andere div wird schlicht.
      div: (tagName, attribs) => {
        const out: Record<string, string> = {};
        if (attribs["data-pdf"] !== undefined) out["data-pdf"] = "";
        else if (attribs["data-callout"] && (CALLOUT_KINDS as readonly string[]).includes(attribs["data-callout"])) out["data-callout"] = attribs["data-callout"];
        else if (attribs["data-type"] === "detailsContent") out["data-type"] = "detailsContent";
        // Abschnitt einer gebündelten Nachricht (mehrere Figuren): nur mit gültiger Figuren-ID
        else if (attribs["data-type"] === "segment" && /^[0-9a-f-]{36}$/i.test(attribs["data-id"] ?? "")) {
          out["data-type"] = "segment";
          out["data-id"] = attribs["data-id"];
          out["data-name"] = (attribs["data-name"] ?? "").slice(0, 80);
        }
        return { tagName, attribs: out };
      },
      // Aufgabenlisten (Notizen): nur die bekannten Kennzeichnungen, Kästchen immer gesperrt
      ul: (tagName, attribs) => ({ tagName, attribs: (attribs["data-type"] === "taskList" ? { "data-type": "taskList" } : {}) as Record<string, string> }),
      li: (tagName, attribs) => ({
        tagName,
        attribs: (attribs["data-type"] === "taskItem" ? { "data-type": "taskItem", "data-checked": attribs["data-checked"] === "true" ? "true" : "false" } : {}) as Record<string, string>,
      }),
      input: (tagName, attribs) => ({ tagName, attribs: { type: "checkbox", disabled: "disabled", ...(attribs.checked !== undefined ? { checked: "checked" } : {}) } }),
      th: (tagName, attribs) => ({ tagName, attribs: spanAttribs(attribs) }),
      td: (tagName, attribs) => ({ tagName, attribs: spanAttribs(attribs) }),
    },
    // Nur font-family und font-size erlaubt: Schrift nur mit einem Wert, der wie eine unserer generierten
    // Schriftstapel aussieht (siehe PROFILE_FONTS), Größe nur als ganze Pixelzahl von 10 bis 48 - verhindert
    // CSS-Injection über das Inline-Style-Attribut, das die Wort-/Buchstaben-genaue Schrift- und Größenwahl braucht.
    allowedStyles: {
      span: {
        "font-family": [/^var\(--font-[a-z-]+\)(,\s*[a-zA-Z0-9 '"-]+)*$/],
        "font-size": [/^(?:1[0-9]|[2-3][0-9]|4[0-8])px$/],
      },
    },
  });
}

function spanAttribs(attribs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const col = clampSpan(attribs.colspan);
  const row = clampSpan(attribs.rowspan);
  if (col) out.colspan = col;
  if (row) out.rowspan = row;
  return out;
}
