// Auswahllisten einer Welt (Wesen, Haus/Fraktion, Beruf …): je Liste ein Dropdown oder ein freies Textfeld.
export type ChoiceList = {
  id: string;
  label: string;
  mode: "dropdown" | "text";
  isSpecies: boolean;
  // Die Liste ist abgeschaltet (bei „Wesen“: das Feld entfällt in dieser Welt ganz)
  disabled?: boolean;
  // maxCount: Höchstzahl der Charaktere mit diesem Eintrag in der Welt (null = unbegrenzt); used: wie viele es schon gibt
  options: { id: string; label: string; maxCount?: number | null; used?: number }[];
};

export const MAX_CHOICE_LISTS = 12;
export const MAX_CHOICE_OPTIONS = 100;

// Eine Liste erscheint beim Anlegen, wenn sie Einträge hat oder ein Textfeld ist (und nicht abgeschaltet wurde).
export function isListActive(list: ChoiceList): boolean {
  return !list.disabled && (list.mode === "text" || list.options.length > 0);
}

// Hat die Welt das Feld „Wesen“ abgeschaltet? Dann gibt es weder Dropdown noch feste Auswahl (Mensch, Vampir, Werwolf).
export function isSpeciesOff(lists: ChoiceList[]): boolean {
  return lists.some((l) => l.isSpecies && l.disabled);
}

export function activeLists(lists: ChoiceList[]): ChoiceList[] {
  return lists.filter(isListActive);
}

// Werte aus dem Formular (Feld `choice_<ListenID>`): Dropdown-Werte müssen in der Liste stehen, Text wird gekürzt.
export function parseChoices(get: (key: string) => string | null, lists: ChoiceList[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const list of activeLists(lists)) {
    const raw = (get(`choice_${list.id}`) ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!raw) continue;
    if (list.mode === "dropdown" && !list.options.some((o) => o.label === raw)) continue;
    out[list.id] = raw;
  }
  return out;
}

// Die feste Natur (Würfel-Mechanik) leitet sich aus dem gewählten Wesen ab, wenn der Name passt.
export function speciesFromLabel(label: string | null | undefined): "mensch" | "vampir" | "werwolf" {
  const v = (label ?? "").trim().toLowerCase();
  return v === "vampir" || v === "werwolf" ? v : "mensch";
}

// Wie viele Charaktere haben je Liste und Eintrag schon diesen Wert: { listenId: { Eintrag: Anzahl } }
export type ChoiceUsage = Record<string, Record<string, number>>;

// Ist ein gewählter Eintrag schon so oft vergeben, wie die Welt erlaubt? `own` sind die bisherigen Werte des Charakters, der gerade
// bearbeitet wird: Behält er seinen Eintrag, zählt er nicht gegen die Grenze.
export function limitError(lists: ChoiceList[], choices: Record<string, string>, usage: ChoiceUsage, own: Record<string, string> = {}): string | null {
  for (const list of lists) {
    const value = choices[list.id];
    if (!value || list.mode !== "dropdown" || own[list.id] === value) continue;
    const option = list.options.find((o) => o.label === value);
    if (!option || option.maxCount == null) continue;
    const used = usage[list.id]?.[value] ?? 0;
    if (used >= option.maxCount) return `„${value}“ gibt es in dieser Welt schon ${option.maxCount}× (${list.label}). Bitte wähle etwas anderes.`;
  }
  return null;
}

// Für die Anzeige im Profil: nur Listen, zu denen ein Wert gewählt wurde, in Listenreihenfolge.
export function choiceEntries(choices: unknown, lists: ChoiceList[]): { label: string; value: string }[] {
  const src = choices && typeof choices === "object" ? (choices as Record<string, unknown>) : {};
  const out: { label: string; value: string }[] = [];
  for (const list of lists) {
    if (list.disabled) continue;
    const v = src[list.id];
    if (typeof v === "string" && v.trim()) out.push({ label: list.label, value: v });
  }
  return out;
}

// Mehrere Einträge auf einmal: eine pro Zeile oder durch Kommas getrennt, ohne Doppelte.
export function splitOptionLabels(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const label = part.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
  }
  return out;
}
