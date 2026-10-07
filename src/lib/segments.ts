// „Bündeln“: mehrere eigene Figuren in EINER Nachricht. Gespeichert wird ein Text aus Abschnitten
//   <div data-type="segment" data-id="<Figur>" data-name="<Name>">…Absätze…</div>
// Angezeigt werden sie wie einzelne Nachrichten mit Bild und Namen. Abschnitte enthalten nur Absatztext (keine verschachtelten div).
export type Segment = { id: string; name: string; html: string };

const SEGMENT = /<div\b[^>]*data-type="segment"[^>]*>([\s\S]*?)<\/div>/g;
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? "";

const unescapeAttr = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Zerlegt gespeicherten Text in Abschnitte; null, wenn die Nachricht nicht gebündelt ist
export function splitSegments(html: string): Segment[] | null {
  if (!html.includes('data-type="segment"')) return null;
  const out: Segment[] = [];
  let rest = html;
  for (const m of html.matchAll(SEGMENT)) {
    const tag = m[0].slice(0, m[0].indexOf(">") + 1);
    const id = attr(tag, "data-id");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    out.push({ id, name: unescapeAttr(attr(tag, "data-name")), html: m[1] });
    rest = rest.replace(m[0], "");
  }
  // Steht außerhalb der Abschnitte noch Text, ist es keine reine Bündel-Nachricht
  if (out.length === 0 || rest.replace(/<[^>]*>/g, "").trim()) return null;
  return out;
}

export function buildSegments(segments: Segment[]): string {
  return segments.map((s) => `<div data-type="segment" data-id="${s.id}" data-name="${escapeAttr(s.name.slice(0, 80))}">${s.html}</div>`).join("");
}

export function segmentCharacterIds(html: string): string[] {
  return Array.from(new Set((splitSegments(html) ?? []).map((s) => s.id)));
}
