// Tastenkürzel zum Wechseln des schreibenden Charakters: frei belegbare Ziffern (1–9), Schnellsuche und Weiterschalten.
// Reine Logik ohne Browser-Zugriff (testbar); der Speicher liegt im Browser (siehe load/save).

export const KEYS_STORAGE = "wortwinkel:writer-keys";
export const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

// Eigene Belegung: Charakter-Id → Ziffer
export type CustomKeys = Record<string, string>;

export function loadCustomKeys(): CustomKeys {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS_STORAGE) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string" && (DIGITS as readonly string[]).includes(v))) as CustomKeys;
  } catch {
    return {};
  }
}

export function saveCustomKeys(keys: CustomKeys): void {
  try {
    localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
  } catch {
    /* egal */
  }
}

// Ziffer → Charakter-Id. Eigene Belegungen gelten zuerst; wer keine hat, bekommt die niedrigsten noch freien Ziffern
// in der angegebenen (festen) Reihenfolge. Belegungen für Charaktere, die es nicht mehr gibt, werden ignoriert.
export function resolveKeyMap(orderedIds: string[], custom: CustomKeys): Record<string, string> {
  const map: Record<string, string> = {};
  const known = new Set(orderedIds);
  for (const [id, digit] of Object.entries(custom)) {
    if (known.has(id) && !map[digit]) map[digit] = id;
  }
  const placed = new Set(Object.values(map));
  const free = DIGITS.filter((d) => !map[d]);
  for (const id of orderedIds) {
    if (placed.has(id)) continue;
    const digit = free.shift();
    if (!digit) break;
    map[digit] = id;
  }
  return map;
}

export function keyOf(map: Record<string, string>, id: string): string | null {
  return Object.keys(map).find((d) => map[d] === id) ?? null;
}

// Ziffer für einen Charakter festlegen (null = zurück zur automatischen Ziffer); dieselbe Ziffer bei anderen wird frei.
export function assignKey(custom: CustomKeys, id: string, digit: string | null): CustomKeys {
  const next: CustomKeys = {};
  for (const [other, d] of Object.entries(custom)) {
    if (other !== id && d !== digit) next[other] = d;
  }
  if (digit) next[id] = digit;
  return next;
}

// Nächster (dir = 1) oder vorheriger (dir = -1) Eintrag in einer Liste, am Ende wieder von vorn.
export function cycleId(orderedIds: string[], currentId: string | undefined, dir: 1 | -1): string | null {
  if (orderedIds.length === 0) return null;
  const i = currentId ? orderedIds.indexOf(currentId) : -1;
  if (i === -1) return orderedIds[dir === 1 ? 0 : orderedIds.length - 1];
  return orderedIds[(i + dir + orderedIds.length) % orderedIds.length];
}

const fold = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Schnellsuche: Treffer, wenn ein Wort des Namens mit dem Suchtext beginnt (ä = a, Groß/Klein egal) oder er im Namen vorkommt.
export function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return items;
  const starts = items.filter((c) => fold(c.name).split(/\s+/).some((w) => w.startsWith(q)));
  const contains = items.filter((c) => !starts.includes(c) && fold(c.name).includes(q));
  return [...starts, ...contains];
}
