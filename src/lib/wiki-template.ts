import { cleanFieldIcon, type ProfileField } from "@/lib/profile-fields";
import type { SecretItem } from "@/lib/secret-items";

// Vorlage der Wiki-Einträge von Figuren (je Welt): welche Felder jeder Eintrag zu Beginn hat; secret = geheimes Feld.
export type TemplateField = { icon: string; title: string; secret: boolean };

export const MAX_TEMPLATE_FIELDS = 12;

export function parseTemplate(raw: unknown): TemplateField[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out: TemplateField[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const title = String(e.title ?? "").trim().slice(0, 40);
    const key = `${e.secret === true ? "s" : "p"}:${title.toLowerCase()}`;
    if (!title || seen.has(key)) continue;
    seen.add(key);
    out.push({ icon: cleanFieldIcon(String(e.icon ?? "")), title, secret: e.secret === true });
    if (out.length >= MAX_TEMPLATE_FIELDS) break;
  }
  return out;
}

// Leere Zeilen aus der Vorlage, soweit die Seite das Feld (gleicher Titel) noch nicht hat
export function missingPublicRows(template: TemplateField[], have: ProfileField[]): ProfileField[] {
  const titles = new Set(have.map((f) => f.title.trim().toLowerCase()));
  return template.filter((t) => !t.secret && !titles.has(t.title.toLowerCase())).map((t) => ({ icon: t.icon, title: t.title, text: "" }));
}

export function missingSecretRows(template: TemplateField[], have: SecretItem[]): SecretItem[] {
  const titles = new Set(have.map((f) => f.title.trim().toLowerCase()));
  return template.filter((t) => t.secret && !titles.has(t.title.toLowerCase())).map((t) => ({ icon: t.icon, title: t.title, text: "", shared_with: [] }));
}
