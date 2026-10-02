import { stripHtml } from "@/lib/strip-html";

export type Heading = { id: string; text: string; level: 2 | 3 };

// Gibt <h2>/<h3> im (bereits bereinigten) HTML eine id und liefert die Liste für das Inhaltsverzeichnis.
export function addHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, level: string, inner: string) => {
    const id = `abschnitt-${headings.length + 1}`;
    headings.push({ id, text: stripHtml(inner), level: Number(level) as 2 | 3 });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, headings: headings.filter((h) => h.text) };
}
