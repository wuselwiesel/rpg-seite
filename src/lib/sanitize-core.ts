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
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      span: ["data-type", "data-id", "class", "style"],
      div: ["data-callout", "data-type", "data-id", "data-name"],
      details: ["open"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Nur die bekannten Hinweis-Arten und der Spoiler-Inhalt behalten ihre Kennzeichnung; jedes andere div wird schlicht.
      div: (tagName, attribs) => {
        const out: Record<string, string> = {};
        if (attribs["data-callout"] && (CALLOUT_KINDS as readonly string[]).includes(attribs["data-callout"])) out["data-callout"] = attribs["data-callout"];
        else if (attribs["data-type"] === "detailsContent") out["data-type"] = "detailsContent";
        // Abschnitt einer gebündelten Nachricht (mehrere Figuren): nur mit gültiger Figuren-ID
        else if (attribs["data-type"] === "segment" && /^[0-9a-f-]{36}$/i.test(attribs["data-id"] ?? "")) {
          out["data-type"] = "segment";
          out["data-id"] = attribs["data-id"];
          out["data-name"] = (attribs["data-name"] ?? "").slice(0, 80);
        }
        return { tagName, attribs: out };
      },
      th: (tagName, attribs) => ({ tagName, attribs: spanAttribs(attribs) }),
      td: (tagName, attribs) => ({ tagName, attribs: spanAttribs(attribs) }),
    },
    // Nur font-family erlaubt, und nur mit einem Wert, der wie eine unserer generierten
    // Schriftstapel aussieht (siehe PROFILE_FONTS) - verhindert CSS-Injection über das
    // Inline-Style-Attribut, das die Wort-/Buchstaben-genaue Schriftwahl in Posts braucht.
    allowedStyles: {
      span: {
        "font-family": [/^var\(--font-[a-z-]+\)(,\s*[a-zA-Z0-9 '"-]+)*$/],
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
