import { stripHtml } from "@/lib/strip-html";

// Zusammenfassungen sind formatierter Text (HTML). Ältere, reine Texte mit Zeilenumbrüchen werden zu Absätzen.
export function recapToHtml(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n+/)
    .map((line) => `<p>${esc(line.trim())}</p>`)
    .join("");
}

// Leer = kein Text und kein Bild.
export function isEmptyRecap(html: string): boolean {
  return stripHtml(html) === "" && !/<img\b/i.test(html);
}
