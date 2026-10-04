// Vergleich zweier ChaBo-Stände für den Verlauf in der Redaktion: Was hat sich geändert (Feld, alter und neuer Wert)?
import { RACES, attrRows, talentRows, type SheetData } from "@/lib/sheet-rules";

export type SheetChange = { key: string; label: string; from: string | null; to: string | null };

// Mehr Änderungen auf einmal (z. B. Übernahme aus dem alten Bogen) werden zu einer Zeile zusammengefasst.
export const BULK_THRESHOLD = 8;

const show = (n: number | null) => (n == null ? "–" : String(n));
const clip = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// Zeilen (Bezeichnung → Angabe) vergleichen; Zeilen mit gleicher Bezeichnung werden der Reihe nach gepaart.
function diffRows(prev: { label: string; value: string }[], next: { label: string; value: string }[], keyPrefix: string, labelOf: (label: string) => string): SheetChange[] {
  const out: SheetChange[] = [];
  const toMap = (rows: { label: string; value: string }[]) => {
    const m = new Map<string, string>();
    const seen = new Map<string, number>();
    for (const r of rows) {
      const label = r.label.trim() || "Ohne Bezeichnung";
      const n = (seen.get(label) ?? 0) + 1;
      seen.set(label, n);
      m.set(n === 1 ? label : `${label} (${n})`, r.value.trim());
    }
    return m;
  };
  const a = toMap(prev);
  const b = toMap(next);
  for (const label of new Set([...a.keys(), ...b.keys()])) {
    const from = a.get(label) ?? "";
    const to = b.get(label) ?? "";
    if (from !== to) out.push({ key: `${keyPrefix}:${label}`, label: labelOf(label), from: from ? clip(from) : null, to: to ? clip(to) : null });
  }
  return out;
}

export function diffSheets(prev: SheetData | null, next: SheetData): SheetChange[] {
  if (!prev) return [{ key: "created", label: "Charakterbogen", from: null, to: null }];
  const changes: SheetChange[] = [];

  if (prev.race !== next.race) {
    const name = (r: SheetData["race"]) => RACES.find((x) => x.id === r)?.label ?? "Keine";
    changes.push({ key: "race", label: "Besondere Natur", from: name(prev.race), to: name(next.race) });
  }

  // Attribute: Anzeige als Gesamtwert (Glück: Basiswert). Änderungen, die nur die Natur ausgelöst hat, zählen nicht einzeln.
  const raceSame = prev.race === next.race;
  const before = attrRows(prev);
  const after = attrRows(next);
  for (const a of after) {
    const b = before.find((x) => x.code === a.code);
    if (!b) continue;
    const basisChanged = a.basis !== b.basis;
    const bonusChanged = raceSame && a.bonus !== b.bonus;
    if (!basisChanged && !bonusChanged) continue;
    const isLuck = a.code === "GL";
    changes.push({ key: `attr:${a.code}`, label: a.name, from: show(isLuck ? b.basis : b.total), to: show(isLuck ? a.basis : a.total) });
  }

  // Talente: nur wenn der Bonus geändert wurde (der Basiswert ändert sich von selbst mit den Attributen)
  const tBefore = talentRows(prev);
  for (const t of talentRows(next)) {
    const b = tBefore.find((x) => x.slug === t.slug);
    if (!b || t.bonus === b.bonus) continue;
    changes.push({ key: `talent:${t.slug}`, label: t.name, from: show(b.total), to: show(t.total) });
  }

  if ((prev.portraitUrl ?? "") !== (next.portraitUrl ?? "")) changes.push({ key: "portrait", label: "Bild", from: null, to: null });
  changes.push(...diffRows(prev.personalFields, next.personalFields, "personal", (l) => l));
  changes.push(...diffRows(prev.family, next.family, "family", (l) => `Familie (${l})`));

  const notes = (d: SheetData) => d.notesBlocks.map((b) => `${b.label.trim()}\n${plain(b.html)}`).join("\n\n");
  if (notes(prev) !== notes(next)) changes.push({ key: "notes", label: "Notizen", from: null, to: null });

  if (changes.length > BULK_THRESHOLD) return [{ key: "bulk", label: "mehrere Felder", from: null, to: null }];
  return changes;
}

// Zusammenfassen: Folgeänderung desselben Felds durch dieselbe Person kurz danach. Gibt an, was mit der letzten Zeile geschehen soll.
export type MergeAction = { kind: "insert" } | { kind: "update"; to: string | null } | { kind: "remove" };

export function mergeWithRecent(recent: { from: string | null; to: string | null } | null, change: SheetChange): MergeAction {
  if (!recent) return { kind: "insert" };
  // Wieder zurückgesetzt: der Eintrag fällt weg (bei Feldern ohne Werte nie, dort bleibt es bei einer Zeile)
  const hasValues = change.from !== null || change.to !== null;
  if (hasValues && change.to === recent.from) return { kind: "remove" };
  return { kind: "update", to: change.to };
}
