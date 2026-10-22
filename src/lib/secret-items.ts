import { cleanFieldIcon } from "@/lib/profile-fields";

// Geheimes Feld auf der Wiki-Seite einer Figur. shared_with: Figuren (IDs), deren Besitzer:innen das Feld sehen dürfen.
export type SecretItem = { id?: string; icon: string; title: string; text: string; shared_with: string[] };

export const MAX_SECRET_ITEMS = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Liest die Liste aus dem Formular (JSON); unvollständige Zeilen fallen weg.
export function parseSecretItems(raw: unknown): SecretItem[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out: SecretItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const title = String(e.title ?? "").trim().slice(0, 40);
    const text = String(e.text ?? "").trim().slice(0, 300);
    if (!title || !text) continue;
    const shared = Array.isArray(e.shared_with) ? [...new Set(e.shared_with.map(String).filter((s) => UUID.test(s)))].slice(0, 20) : [];
    out.push({ ...(typeof e.id === "string" && UUID.test(e.id) ? { id: e.id } : {}), icon: cleanFieldIcon(String(e.icon ?? "")), title, text, shared_with: shared });
    if (out.length >= MAX_SECRET_ITEMS) break;
  }
  return out;
}
