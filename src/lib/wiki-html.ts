import { stripHtml } from "@/lib/strip-html";

export type Heading = { id: string; text: string; level: 2 | 3 };

// Die wenigen Zeichen, die der Editor als HTML-Entity speichert, wieder als Text lesen (damit „A &amp; B“ im Verzeichnis und im Formular gleich ist)
export function decodeEntities(text: string): string {
  return text.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

// Gibt <h2>/<h3> im (bereits bereinigten) HTML eine id und liefert die Liste für das Inhaltsverzeichnis.
export function addHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, level: string, inner: string) => {
    const id = `abschnitt-${headings.length + 1}`;
    headings.push({ id, text: decodeEntities(stripHtml(inner)).replace(/\s+/g, " ").trim(), level: Number(level) as 2 | 3 });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, headings: headings.filter((h) => h.text) };
}
