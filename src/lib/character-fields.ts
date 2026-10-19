// Felder eines Charakters, zu denen Admins Änderungen vorschlagen können, und das Übernehmen eines Vorschlags.
// Rein und ohne Datenbank: Server und Oberfläche benutzen dieselben Regeln. Schlüssel (key) bleiben stabil:
//   p:<feld>            Profil (Name, Kurzbeschreibung, Haus, Zitat, Status, Geschlecht)
//   c:<listenId>        Auswahlliste der Welt
//   s:personal:<label>  Angabe im ChaBo (Persönliches), gesucht nach Bezeichnung (geheime Zeilen zählen nie)
//   s:family:<label>    Zeile der Familie/Beziehungen
//   s:familyTitle       Überschrift dieser Sektion
//   s:basis:<code> / s:bonus:<code>   Attribute
//   s:talent:<slug>     Talent-Bonus
//   s:note:<label>      Notiz-Block (als Text, Absätze durch Leerzeilen)
import type { ChoiceList } from "@/lib/choice-lists";
import { activeLists } from "@/lib/choice-lists";
import { ATTR_TABLE } from "@/lib/charakterbogen-stats";
import { DEFAULT_FAMILY_TITLE, BASIS_MAX, BASIS_MIN, BONUS_MAX, BONUS_MIN, TALENT_BONUS_MAX, TALENT_BONUS_MIN, parseWhole, talentRows, type SheetData } from "@/lib/sheet-rules";

export type ProfileFields = {
  name: string;
  bio: string | null;
  house: string | null;
  quote: string | null;
  status_text: string | null;
  gender: string | null;
  choices: Record<string, string> | null;
};

export type FieldDef = {
  key: string;
  group: string;
  label: string;
  value: string;
  kind: "text" | "long" | "number" | "select";
  options?: string[];
};

const GENDERS: { value: string; label: string }[] = [
  { value: "maennlich", label: "männlich" },
  { value: "weiblich", label: "weiblich" },
  { value: "divers", label: "divers" },
];

export function genderLabel(v: string | null | undefined): string {
  return GENDERS.find((g) => g.value === v)?.label ?? "";
}

// HTML einer Notiz als Text mit Leerzeilen zwischen den Absätzen
export function htmlToPlain(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function plainToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function listCharacterFields(c: ProfileFields, lists: ChoiceList[], sheet: SheetData | null, opts: { house?: boolean } = {}): FieldDef[] {
  const out: FieldDef[] = [
    { key: "p:name", group: "Profil", label: "Name", value: c.name, kind: "text" },
    { key: "p:bio", group: "Profil", label: "Kurzbeschreibung", value: c.bio ?? "", kind: "long" },
    ...(opts.house === false ? [] : [{ key: "p:house", group: "Profil", label: "Haus / Zugehörigkeit", value: c.house ?? "", kind: "text" as const }]),
    { key: "p:quote", group: "Profil", label: "Zitat", value: c.quote ?? "", kind: "text" },
    { key: "p:status_text", group: "Profil", label: "Status", value: c.status_text ?? "", kind: "text" },
    { key: "p:gender", group: "Profil", label: "Geschlecht", value: genderLabel(c.gender), kind: "select", options: ["", ...GENDERS.map((g) => g.label)] },
  ];
  for (const l of activeLists(lists)) {
    out.push({
      key: `c:${l.id}`,
      group: "Auswahllisten",
      label: l.label,
      value: c.choices?.[l.id] ?? "",
      kind: l.mode === "dropdown" ? "select" : "text",
      ...(l.mode === "dropdown" ? { options: ["", ...l.options.map((o) => o.label)] } : {}),
    });
  }
  if (!sheet) return out;
  const seen = new Set<string>();
  for (const f of sheet.personalFields) {
    if (f.secret || !f.label.trim() || seen.has(`p${f.label}`)) continue;
    seen.add(`p${f.label}`);
    out.push({ key: `s:personal:${f.label}`, group: "ChaBo: Persönliches", label: f.label, value: f.value, kind: "text" });
  }
  out.push({ key: "s:familyTitle", group: `ChaBo: ${sheet.familyTitle}`, label: "Überschrift", value: sheet.familyTitle, kind: "text" });
  for (const f of sheet.family) {
    if (f.secret || !f.label.trim() || seen.has(`f${f.label}`)) continue;
    seen.add(`f${f.label}`);
    out.push({ key: `s:family:${f.label}`, group: `ChaBo: ${sheet.familyTitle}`, label: f.label, value: f.value, kind: "text" });
  }
  for (const a of ATTR_TABLE) {
    out.push({ key: `s:basis:${a.code}`, group: "ChaBo: Attribute", label: `${a.name}: Basiswert`, value: sheet.attrBasis[a.code] ?? "", kind: "number" });
    if (a.code !== "GL") out.push({ key: `s:bonus:${a.code}`, group: "ChaBo: Attribute", label: `${a.name}: Bonus`, value: sheet.attrBonus[a.code] ?? "", kind: "number" });
  }
  for (const t of talentRows(sheet)) {
    out.push({ key: `s:talent:${t.slug}`, group: "ChaBo: Talente", label: `${t.name}: Bonus`, value: sheet.talentBonus[t.slug] ?? "", kind: "number" });
  }
  for (const b of sheet.notesBlocks) {
    if (b.secret || !b.label.trim() || seen.has(`n${b.label}`)) continue;
    seen.add(`n${b.label}`);
    out.push({ key: `s:note:${b.label}`, group: "ChaBo: Notizen", label: b.label, value: htmlToPlain(b.html), kind: "long" });
  }
  return out;
}

export type ApplyResult =
  | { ok: true; profile?: Record<string, unknown>; sheet?: SheetData }
  | { ok: false; error: string };

const fail = (error: string): ApplyResult => ({ ok: false, error });

function wholeInRange(value: string, min: number, max: number): string | null {
  const v = value.trim();
  if (v === "") return "";
  const n = parseWhole(v);
  if (n == null || Number.isNaN(n) || n < min || n > max) return null;
  return String(n);
}

// Wendet einen Vorschlag auf Profil bzw. Bogen an. Gibt die Änderung zurück; gespeichert wird im Server.
export function applyFieldChange(key: string, rawValue: string, c: ProfileFields, lists: ChoiceList[], sheet: SheetData | null): ApplyResult {
  const value = rawValue.replace(/\r\n/g, "\n");
  if (key.startsWith("p:")) {
    const f = key.slice(2);
    if (f === "name") {
      const v = value.trim();
      if (!v) return fail("Der Name darf nicht leer sein.");
      return { ok: true, profile: { name: v.slice(0, 80) } };
    }
    if (f === "bio") return { ok: true, profile: { bio: value.trim().slice(0, 5000) || null } };
    if (f === "house") return { ok: true, profile: { house: value.trim().slice(0, 60) || null } };
    if (f === "quote") return { ok: true, profile: { quote: value.trim().slice(0, 200) || null } };
    if (f === "status_text") return { ok: true, profile: { status_text: value.trim().slice(0, 80) || null } };
    if (f === "gender") {
      const v = value.trim();
      if (!v) return { ok: true, profile: { gender: null } };
      const g = GENDERS.find((x) => x.label === v || x.value === v);
      return g ? { ok: true, profile: { gender: g.value } } : fail("Unbekanntes Geschlecht.");
    }
    return fail("Dieses Feld gibt es nicht.");
  }
  if (key.startsWith("c:")) {
    const list = activeLists(lists).find((l) => l.id === key.slice(2));
    if (!list) return fail("Diese Auswahlliste gibt es nicht mehr.");
    const v = value.replace(/\s+/g, " ").trim().slice(0, 60);
    if (v && list.mode === "dropdown" && !list.options.some((o) => o.label === v)) return fail("Dieser Eintrag steht nicht in der Liste.");
    const choices = { ...(c.choices ?? {}) };
    if (v) choices[list.id] = v;
    else delete choices[list.id];
    return { ok: true, profile: { choices } };
  }
  if (!key.startsWith("s:")) return fail("Dieses Feld gibt es nicht.");
  if (!sheet) return fail("Dieser Charakter hat noch keinen ChaBo.");
  const next: SheetData = JSON.parse(JSON.stringify(sheet));
  const [, kind, ...rest] = key.split(":");
  const arg = rest.join(":");
  if (kind === "personal" || kind === "family") {
    const list = kind === "personal" ? next.personalFields : next.family;
    const item = list.find((f) => !f.secret && f.label === arg);
    if (!item) return fail("Diese Zeile gibt es nicht mehr.");
    item.value = value.replace(/\s+/g, " ").trim().slice(0, 200);
    return { ok: true, sheet: next };
  }
  if (kind === "familyTitle") {
    next.familyTitle = value.trim().slice(0, 40) || DEFAULT_FAMILY_TITLE;
    return { ok: true, sheet: next };
  }
  if (kind === "basis" || kind === "bonus") {
    if (!ATTR_TABLE.some((a) => a.code === arg) || (kind === "bonus" && arg === "GL")) return fail("Dieses Attribut gibt es nicht.");
    const v = kind === "basis" ? wholeInRange(value, BASIS_MIN, BASIS_MAX) : wholeInRange(value, BONUS_MIN, BONUS_MAX);
    if (v == null) return fail(kind === "basis" ? `Der Basiswert liegt zwischen ${BASIS_MIN} und ${BASIS_MAX}.` : `Der Bonus liegt zwischen ${BONUS_MIN} und ${BONUS_MAX}.`);
    (kind === "basis" ? next.attrBasis : next.attrBonus)[arg] = v;
    return { ok: true, sheet: next };
  }
  if (kind === "talent") {
    if (!(arg in next.talentBonus)) return fail("Dieses Talent gibt es nicht mehr.");
    const v = wholeInRange(value, TALENT_BONUS_MIN, TALENT_BONUS_MAX);
    if (v == null) return fail(`Der Talent-Bonus liegt zwischen ${TALENT_BONUS_MIN} und ${TALENT_BONUS_MAX}.`);
    next.talentBonus[arg] = v;
    return { ok: true, sheet: next };
  }
  if (kind === "note") {
    const block = next.notesBlocks.find((b) => !b.secret && b.label === arg);
    if (!block) return fail("Diesen Notiz-Block gibt es nicht mehr.");
    block.html = plainToHtml(value);
    return { ok: true, sheet: next };
  }
  return fail("Dieses Feld gibt es nicht.");
}
