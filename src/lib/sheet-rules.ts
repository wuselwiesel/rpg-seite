// Regeln des Charakterbogens („ChaBo“): Attribute, Talente, Budgets, Glückspunkte, Besondere Natur.
// Rein und ohne DOM, damit Server (Speichern) und Oberfläche dieselben Zahlen benutzen. Datenform wie der alte Charakterbogen.
import { ATTR_TABLE, TALENT_LIST, luckPointsFromGl, talentSlug } from "@/lib/charakterbogen-stats";

export const BASIS_MIN = 1;
export const BASIS_MAX = 19;
export const BONUS_MIN = -19;
export const BONUS_MAX = 19;
export const BASIS_BUDGET = 90;
export const TALENT_BONUS_MIN = -3;
export const TALENT_BONUS_MAX = 19;
export const TALENT_BONUS_BUDGET = 20;

export const MAX_PERSONAL_FIELDS = 30;
export const MAX_FAMILY_FIELDS = 30;
// Vorschläge für die Bezeichnung in der Sektion „Familie“; man kann frei tippen.
export const FAMILY_SUGGESTIONS = ["Mutter", "Vater", "Bruder", "Schwester", "Geschwister", "Großmutter", "Großvater", "Tante", "Onkel", "Cousin", "Cousine", "Partner:in", "Kind", "Rudel", "Zieheltern"];
export const MAX_NOTE_BLOCKS = 30;
export const MAX_NOTE_HTML = 30000;
export const PERSONAL_DEFAULT_LABELS = ["Titel", "Vorname", "Nachname", "Spitzname", "Alter", "Wesen", "Rang"];

export type AttrCode = (typeof ATTR_TABLE)[number]["code"];
export type Race = "none" | "werwolf" | "vampir";

export const RACES: { id: Race; label: string }[] = [
  { id: "none", label: "Keine" },
  { id: "werwolf", label: "Werwolf" },
  { id: "vampir", label: "Vampir" },
];

export const RACE_BONUSES: Record<Exclude<Race, "none">, Partial<Record<AttrCode, number>>> = {
  werwolf: { MU: 3, GE: 5, KO: 5, KK: 5, CH: 1, SB: -5 },
  vampir: { GE: 5, KO: 5, IN: 3, KK: 3, CH: 5, SB: -5 },
};

// Jedes Talent ist der gerundete Durchschnitt zweier Attribut-Gesamtwerte (Glück fließt in keins ein).
export const TALENT_ATTRS: Record<string, [AttrCode, AttrCode]> = {
  "Körperbeherrschung": ["GE", "SB"],
  "Manipulation/Überzeugen": ["CH", "IG"],
  "Betören": ["CH", "IN"],
  "Küssen": ["CH", "GE"],
  "Beruhigen": ["CH", "SB"],
  "Menschenkenntnis": ["IN", "SB"],
  "Willensstärke": ["MU", "SB"],
  "Lügen": ["CH", "IG"],
  "Verbergen/Verheimlichen": ["GE", "IN"],
  "Singen": ["CH", "KO"],
  "Tanzen": ["GE", "KO"],
  "Reflexe": ["GE", "IN"],
  "Klettern": ["GE", "KK"],
  "Fahren": ["IN", "FF"],
  "Medizin": ["IG", "FF"],
  "Tierkunde": ["IN", "MU"],
  "Pflanzenkunde": ["IG", "IN"],
  "Mythologie": ["IG", "MU"],
  "Reparieren": ["FF", "IG"],
  "Empathie": ["IN", "CH"],
  "Sinnesschärfe": ["IN", "IG"],
  "Überleben": ["KO", "MU"],
};

// `relId`: Zeile gehört zu dieser Beziehung im Beziehungsnetz (nur Familie/Beziehungen im ChaBo; gleicht beide Orte ab)
export type SheetItem = { label: string; value: string; secret?: boolean; relId?: string };
export type NoteBlock = { label: string; html: string; secret?: boolean };

export type SheetData = {
  race: Race;
  portraitUrl: string | null;
  luckPointsUsed: number;
  personalFields: SheetItem[];
  // Sektion „Familie“: eigene Zeilen (Bezeichnung + Angabe, mit @ auf Charaktere verlinkbar)
  family: SheetItem[];
  // Überschrift dieser Sektion (frei wählbar, z. B. „Freunde“); leer = „Familie“
  familyTitle: string;
  attrBasis: Record<string, string>;
  attrBonus: Record<string, string>;
  // Wird beim Speichern aus den Attributen berechnet; so lesen die Würfel-Auswahl und der alte Bogen dieselbe Form.
  talentBasis: Record<string, string>;
  talentBonus: Record<string, string>;
  notesBlocks: NoteBlock[];
};

export function emptySheet(): SheetData {
  return {
    race: "none",
    portraitUrl: null,
    luckPointsUsed: 0,
    personalFields: PERSONAL_DEFAULT_LABELS.map((label) => ({ label, value: "" })),
    family: [],
    familyTitle: "Familie",
    attrBasis: {},
    attrBonus: {},
    talentBasis: {},
    talentBonus: {},
    notesBlocks: [{ label: "Notizen", html: "" }],
  };
}

// Ganze Zahl aus einem Eingabefeld: leer = null, Unsinn = NaN.
export function parseWhole(raw: string | number | null | undefined): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  return /^-?\d+$/.test(s) ? Number.parseInt(s, 10) : Number.NaN;
}

export type AttrRow = { code: string; name: string; basis: number | null; bonus: number | null; total: number | null };

export function attrRows(data: SheetData): AttrRow[] {
  return ATTR_TABLE.map((a) => {
    const b = parseWhole(data.attrBasis[a.code]);
    const bo = a.code === "GL" ? null : parseWhole(data.attrBonus[a.code]);
    const basis = b != null && !Number.isNaN(b) ? b : null;
    const bonus = bo != null && !Number.isNaN(bo) ? bo : null;
    // Glück hat keinen Bonus und keinen Gesamtwert; der Basiswert bestimmt die Glückspunkte.
    const total = a.code === "GL" || (basis == null && bonus == null) ? null : (basis ?? 0) + (bonus ?? 0);
    return { code: a.code, name: a.name, basis, bonus, total };
  });
}

export type TalentRow = {
  name: string;
  slug: string;
  attrs: [AttrCode, AttrCode];
  basis: number | null;
  bonus: number | null;
  total: number | null;
  capped: boolean;
};

export function talentRows(data: SheetData): TalentRow[] {
  const totals = new Map(attrRows(data).map((r) => [r.code, r.total]));
  return TALENT_LIST.map((name) => {
    const slug = talentSlug(name);
    const attrs = TALENT_ATTRS[name];
    const a1 = totals.get(attrs[0]);
    const a2 = totals.get(attrs[1]);
    const basis = a1 != null && a2 != null ? Math.round((a1 + a2) / 2) : null;
    const bo = parseWhole(data.talentBonus[slug]);
    const bonus = bo != null && !Number.isNaN(bo) ? bo : null;
    const raw = basis == null ? null : basis + (bonus ?? 0);
    const total = raw == null ? null : Math.min(TALENT_BONUS_MAX, raw);
    return { name, slug, attrs, basis, bonus, total, capped: raw != null && raw > TALENT_BONUS_MAX };
  });
}

export function budgets(data: SheetData) {
  const basisUsed = attrRows(data).reduce((s, r) => s + (r.basis ?? 0), 0);
  const talentUsed = talentRows(data).reduce((s, r) => s + (r.bonus ?? 0), 0);
  return {
    basisUsed,
    basisRemaining: BASIS_BUDGET - basisUsed,
    talentUsed,
    talentRemaining: TALENT_BONUS_BUDGET - talentUsed,
  };
}

export function luckTotal(data: SheetData): number {
  const gl = attrRows(data).find((r) => r.code === "GL")?.basis;
  return gl == null ? 0 : luckPointsFromGl(gl);
}

export function luckAvailable(data: SheetData): number {
  return Math.max(0, luckTotal(data) - Math.max(0, data.luckPointsUsed || 0));
}

// Besondere Natur: setzt die Boni der Rasse; bei Wechsel werden die Boni der alten und der neuen Rasse überschrieben (wie im alten Bogen).
export function applyRace(data: SheetData, race: Race): SheetData {
  const oldB = data.race === "none" ? {} : RACE_BONUSES[data.race];
  const newB = race === "none" ? {} : RACE_BONUSES[race];
  const attrBonus = { ...data.attrBonus };
  for (const code of new Set([...Object.keys(oldB), ...Object.keys(newB)])) {
    const v = (newB as Record<string, number | undefined>)[code];
    attrBonus[code] = v !== undefined ? String(v) : "";
  }
  return { ...data, race, attrBonus };
}

// Fehler je Feld und für die Budgets. Leere Felder sind gültig.
export type SheetErrors = { attrBasis: Record<string, string>; attrBonus: Record<string, string>; talentBonus: Record<string, string>; budget: string[] };

function rangeError(raw: string | undefined, min: number, max: number): string | null {
  const n = parseWhole(raw);
  if (n == null) return null;
  if (Number.isNaN(n)) return "Nur ganze Zahlen";
  if (n < min || n > max) return `${min} bis ${max}`;
  return null;
}

export function validateSheet(data: SheetData): SheetErrors {
  const errors: SheetErrors = { attrBasis: {}, attrBonus: {}, talentBonus: {}, budget: [] };
  for (const a of ATTR_TABLE) {
    const e1 = rangeError(data.attrBasis[a.code], BASIS_MIN, BASIS_MAX);
    if (e1) errors.attrBasis[a.code] = e1;
    if (a.code !== "GL") {
      const e2 = rangeError(data.attrBonus[a.code], BONUS_MIN, BONUS_MAX);
      if (e2) errors.attrBonus[a.code] = e2;
    }
  }
  for (const name of TALENT_LIST) {
    const slug = talentSlug(name);
    const e = rangeError(data.talentBonus[slug], TALENT_BONUS_MIN, TALENT_BONUS_MAX);
    if (e) errors.talentBonus[slug] = e;
  }
  const b = budgets(data);
  if (b.basisRemaining < 0) errors.budget.push(`${-b.basisRemaining} Attributpunkte zu viel (max. ${BASIS_BUDGET})`);
  if (b.talentRemaining < 0) errors.budget.push(`${-b.talentRemaining} Talentpunkte zu viel (max. ${TALENT_BONUS_BUDGET})`);
  return errors;
}

export function hasErrors(e: SheetErrors): boolean {
  return Object.keys(e.attrBasis).length + Object.keys(e.attrBonus).length + Object.keys(e.talentBonus).length + e.budget.length > 0;
}

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
const numStr = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^-?\d{1,3}$/.test(s) ? s : "";
};

// Macht aus beliebigen Daten (Formular, alter Bogen, Datenbank) einen gültigen SheetData; kaputte Werte werden leer.
// Die Notiz-Texte (HTML) bereinigt der Server zusätzlich mit sanitizePostHtml.
export function normalizeSheet(raw: unknown): SheetData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rec = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const base = emptySheet();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const item = (f: unknown): SheetItem => ({
    label: clip(rec(f).label, 40),
    value: clip(rec(f).value, 200),
    ...(rec(f).secret === true ? { secret: true } : {}),
    ...(typeof rec(f).relId === "string" && uuid.test(rec(f).relId as string) && rec(f).secret !== true ? { relId: rec(f).relId as string } : {}),
  });

  const attrBasis: Record<string, string> = {};
  const attrBonus: Record<string, string> = {};
  for (const a of ATTR_TABLE) {
    attrBasis[a.code] = numStr(rec(r.attrBasis)[a.code]);
    attrBonus[a.code] = a.code === "GL" ? "" : numStr(rec(r.attrBonus)[a.code]);
  }
  const talentBonus: Record<string, string> = {};
  for (const name of TALENT_LIST) talentBonus[talentSlug(name)] = numStr(rec(r.talentBonus)[talentSlug(name)]);

  const fields = Array.isArray(r.personalFields) ? r.personalFields : null;
  const personalFields = fields
    ? fields.slice(0, MAX_PERSONAL_FIELDS).map((f) => item(f))
    : base.personalFields;

  const familyRaw = Array.isArray(r.family) ? r.family : [];
  const family = familyRaw.slice(0, MAX_FAMILY_FIELDS).map((f) => item(f));

  const familyTitle = clip(r.familyTitle, 40).trim() || "Familie";

  const blocks = Array.isArray(r.notesBlocks) ? r.notesBlocks : null;
  const notesBlocks = blocks?.length
    ? blocks.slice(0, MAX_NOTE_BLOCKS).map((b) => ({ label: clip(rec(b).label, 60), html: clip(rec(b).html, MAX_NOTE_HTML), ...(rec(b).secret === true ? { secret: true } : {}) }))
    : base.notesBlocks;

  const race: Race = r.race === "werwolf" || r.race === "vampir" ? r.race : "none";
  const portrait = typeof r.portraitUrl === "string" && /^https?:\/\//.test(r.portraitUrl) && r.portraitUrl.length <= 500 ? r.portraitUrl : null;
  const used = Number(r.luckPointsUsed);

  const data: SheetData = {
    race,
    portraitUrl: portrait,
    luckPointsUsed: Number.isInteger(used) && used >= 0 && used <= 99 ? used : 0,
    personalFields,
    family,
    familyTitle,
    attrBasis,
    attrBonus,
    talentBasis: {},
    talentBonus,
    notesBlocks,
  };
  return withDerived(data);
}

// Talent-Basiswerte als Text eintragen (die alte Form, die auch die Würfel-Auswahl liest).
export function withDerived(data: SheetData): SheetData {
  const talentBasis: Record<string, string> = {};
  for (const t of talentRows(data)) talentBasis[t.slug] = t.basis == null ? "" : String(t.basis);
  return { ...data, talentBasis };
}

// ---- Geheimes: liegt in einer eigenen, nur für die Besitzer:in lesbaren Tabelle ----

type Positioned<T> = T & { pos: number };
export type SheetSecrets = {
  personalFields: Positioned<SheetItem>[];
  family: Positioned<SheetItem>[];
  notesBlocks: Positioned<NoteBlock>[];
};

export function emptySecrets(): SheetSecrets {
  return { personalFields: [], family: [], notesBlocks: [] };
}

export function hasSecrets(s: SheetSecrets): boolean {
  return s.personalFields.length + s.family.length + s.notesBlocks.length > 0;
}

function splitList<T extends { secret?: boolean }>(list: T[]): { open: T[]; secret: Positioned<T>[] } {
  const open: T[] = [];
  const secret: Positioned<T>[] = [];
  list.forEach((x, pos) => {
    if (x.secret) secret.push({ ...x, pos });
    else open.push(x);
  });
  return { open, secret };
}

// Trennt den Bogen: „open“ ist für alle in der Welt lesbar und enthält nie ein geheimes Element; „secrets“ merkt sich die Position für das Zurücksetzen.
export function splitSecrets(data: SheetData): { open: SheetData; secrets: SheetSecrets } {
  const p = splitList(data.personalFields);
  const f = splitList(data.family);
  const n = splitList(data.notesBlocks);
  return { open: { ...data, personalFields: p.open, family: f.open, notesBlocks: n.open }, secrets: { personalFields: p.secret, family: f.secret, notesBlocks: n.secret } };
}

function mergeList<T extends { secret?: boolean }>(open: T[], secret: Positioned<T>[]): T[] {
  const out = open.filter((x) => !x.secret);
  for (const s of [...secret].sort((a, b) => a.pos - b.pos)) {
    const { pos, ...rest } = s;
    out.splice(Math.min(Math.max(0, pos), out.length), 0, { ...(rest as unknown as T), secret: true });
  }
  return out;
}

// Liest die geheimen Daten aus der Datenbank (beliebige Form) in eine gültige Form.
export function parseSecrets(raw: unknown): SheetSecrets {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const asObj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const pos = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 200 ? (v as number) : 0);
  const items = (v: unknown): Positioned<SheetItem>[] =>
    (Array.isArray(v) ? v : []).slice(0, MAX_PERSONAL_FIELDS).map((x) => ({ label: clip(asObj(x).label, 40), value: clip(asObj(x).value, 200), pos: pos(asObj(x).pos) }));
  const blocks = (v: unknown): Positioned<NoteBlock>[] =>
    (Array.isArray(v) ? v : []).slice(0, MAX_NOTE_BLOCKS).map((x) => ({ label: clip(asObj(x).label, 60), html: clip(asObj(x).html, MAX_NOTE_HTML), pos: pos(asObj(x).pos) }));
  return { personalFields: items(r.personalFields), family: items(r.family), notesBlocks: blocks(r.notesBlocks) };
}

// Setzt die geheimen Elemente wieder an ihre Stelle (nur für die Besitzer:in aufrufen).
export function mergeSecrets(open: SheetData, secrets: SheetSecrets): SheetData {
  return {
    ...open,
    personalFields: mergeList(open.personalFields, secrets.personalFields),
    family: mergeList(open.family, secrets.family),
    notesBlocks: mergeList(open.notesBlocks, secrets.notesBlocks),
  };
}

// Entfernt alles Geheime (Absicherung für Ansichten fremder Bögen, auch falls je etwas Falsches in der offenen Zeile stünde).
export function stripSecrets(data: SheetData): SheetData {
  return splitSecrets(data).open;
}
