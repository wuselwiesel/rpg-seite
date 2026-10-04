// Zufallsfelder für den ChaBo (Name, Alter, Wesen, Hobbys, Beruf/Schule, Eigenheiten, Aussehen): mitgelieferte deutsche Listen für eine
// moderne Schul- und Alltagswelt mit Wesen, dazu eigene Einträge je Welt (siehe world_random_entries), die eingemischt werden.
// Rein; die Zufallsquelle kommt als Parameter (`Rng`), damit Tests mit festem Seed laufen.
import { pick, randInt, type Rng } from "@/lib/sheet-random";
import { MAX_PERSONAL_FIELDS, applyRace, type Race, type SheetData, type SheetItem } from "@/lib/sheet-rules";

export const POOL_KINDS = ["vorname", "nachname", "spitzname", "hobby", "beruf", "eigenheit", "aussehen"] as const;
export type PoolKind = (typeof POOL_KINDS)[number];
export type FieldKind = PoolKind | "alter" | "wesen";
// Eigene Einträge je Art (die mitgelieferten Listen sind eingebaut)
export type CustomPools = Record<PoolKind, string[]>;

export const POOL_LABELS: Record<PoolKind, string> = {
  vorname: "Vornamen",
  nachname: "Nachnamen",
  spitzname: "Spitznamen",
  hobby: "Hobbys",
  beruf: "Beruf, Schule, AG",
  eigenheit: "Eigenheiten",
  aussehen: "Aussehen",
};

export function emptyCustomPools(): CustomPools {
  return { vorname: [], nachname: [], spitzname: [], hobby: [], beruf: [], eigenheit: [], aussehen: [] };
}

// ---- mitgelieferte Listen ----

const VORNAMEN = [
  "Anna", "Ben", "Charlotte", "David", "Emilia", "Felix", "Greta", "Hannah", "Ida", "Jonas", "Klara", "Luca", "Mia", "Noah", "Olivia", "Paul", "Rosa", "Samuel", "Tilda", "Ulrike",
  "Valentin", "Wanda", "Xaver", "Yara", "Zoe", "Alina", "Bastian", "Carla", "Damian", "Elias", "Fiona", "Gabriel", "Helena", "Ivo", "Jana", "Kilian", "Lena", "Matteo", "Nina", "Oskar",
  "Pia", "Quentin", "Rafael", "Sophie", "Theo", "Uma", "Vera", "Wiebke", "Yannick", "Zara", "Amelie", "Benno", "Clara", "Dario", "Eva", "Finn", "Giulia", "Henri", "Isabel", "Jakob",
  "Katharina", "Leon", "Marlene", "Nils", "Ophelia", "Philipp", "Ronja", "Stella", "Tamara", "Ulf", "Viola", "Wilhelm", "Yasmin", "Zeno", "Aaron", "Bianca", "Cedric", "Dorothea", "Emil", "Frieda",
  "Gustav", "Hedwig", "Imke", "Jasper", "Kira", "Lennard", "Mathilda", "Noel", "Odette", "Pascal", "Romy", "Silas", "Thea", "Urs", "Vivien", "Winona", "Ylvie", "Zacharias", "Leni", "Joris",
  "Mira", "Nico", "Lilith", "Elvira", "Kasimir", "Lucian", "Selma", "Tabea", "Malte", "Runa",
];

const NACHNAMEN = [
  "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger",
  "Hartmann", "Lange", "Werner", "Krause", "Lehmann", "Köhler", "Herrmann", "König", "Walter", "Huber", "Kaiser", "Fuchs", "Peters", "Scholz", "Möller", "Weiß", "Jung", "Hahn", "Schubert", "Vogel",
  "Friedrich", "Keller", "Günther", "Frank", "Berger", "Winkler", "Roth", "Beck", "Lorenz", "Baumann", "Albrecht", "Schuster", "Simon", "Ludwig", "Böhm", "Winter", "Kraus", "Martin", "Schumacher", "Krämer",
  "Vogt", "Stein", "Jäger", "Otto", "Sommer", "Groß", "Seidel", "Heinrich", "Brandt", "Haas", "Schreiber", "Graf", "Dietrich", "Ziegler", "Kuhn", "Pohl", "Engel", "Horn", "Busch", "Bergmann",
  "Voigt", "Sauer", "Arnold", "Pfeiffer", "Nachtigall", "Rabenstein", "Falkenberg", "Nebel", "Wolfsberg", "Eichhorn", "Tannenberg", "Mondorf", "Sternberg", "Birkenfeld", "Waldmann", "Kupfer", "Lindner", "Hirsch", "Marder", "Specht",
];

const SPITZNAMEN = [
  "Lu", "Fix", "Mimi", "Dino", "Spatz", "Bär", "Fuchs", "Käpt'n", "Schatten", "Funke", "Nacht", "Blitz", "Keks", "Pixel", "Mücke", "Murmel", "Zwerg", "Hase", "Lotte", "Mops",
  "Biene", "Krümel", "Rabe", "Flo", "Tinte", "Wirbel", "Sunny", "Moon", "Piet", "Joe", "Maus", "Igel", "Flummi", "Nuss", "Püppi", "Luchs", "Wolke", "Brummbär", "Smilla", "Tiger",
  "Kiwi", "Zimt", "Pfeffer", "Locke", "Flocke", "Racker", "Kobold", "Glühwürmchen", "Specht", "Nebel", "Dachs", "Kater", "Elster", "Sputnik", "Boss", "Doc", "Ziggy", "Mo", "Nele", "Banjo",
];

const HOBBYS = [
  "Lesen", "Zeichnen", "Gitarre spielen", "Klavier", "Schwimmen", "Laufen", "Fotografieren", "Backen", "Kochen", "Gärtnern", "Videospiele", "Brettspiele", "Rollenspiele", "Schreiben", "Tanzen", "Singen", "Klettern", "Radfahren", "Wandern", "Angeln",
  "Stricken", "Nähen", "Töpfern", "Malen", "Skateboard", "Basketball", "Fußball", "Volleyball", "Tischtennis", "Reiten", "Fechten", "Bogenschießen", "Schach", "Sterne beobachten", "Sammeln alter Münzen", "Vinyl-Platten", "Podcasts hören", "Filme schauen", "Serien", "Theater",
  "Programmieren", "Basteln", "Origami", "Kalligrafie", "Urban Sketching", "Yoga", "Meditation", "Boxen", "Judo", "Parkour", "Surfen", "Snowboarden", "Schlittschuhlaufen", "Geocaching", "Pilze sammeln", "Imkern", "Kräuterkunde", "Tee sammeln", "Flohmärkte", "Karaoke",
  "Cosplay", "Modellbau", "Comics lesen", "Mangas zeichnen", "Songs schreiben", "Beatboxen", "Ukulele", "Geige", "Schlagzeug", "Nachtspaziergänge", "Mythen und Sagen", "Tierbeobachtung", "Wildtierfotografie", "Spieleabende", "Rätsel", "Escape Rooms",
];

const BERUF_SCHULE = [
  "Schüler:in, 8. Klasse", "Schüler:in, 9. Klasse", "Schüler:in, 10. Klasse", "Schüler:in, 11. Klasse", "Schüler:in, Oberstufe", "Schüler:in, Abschlussklasse", "Theater-AG", "Schach-AG", "Schülerzeitung", "Orchester-AG",
  "Chor-AG", "Foto-AG", "Schulsanitätsdienst", "Basketball-Team der Schule", "Schwimm-AG", "Programmier-AG", "Kunst-AG", "Schülersprecher:in", "Garten-AG", "Debattierclub",
  "Nachhilfe-Schüler:in", "Austauschschüler:in", "Mathe-Olympiade-Team", "Naturschutz-AG", "Radio-AG der Schule",
];
const BERUF_JUNG = [
  "Studium Literatur", "Studium Biologie", "Studium Informatik", "Studium Kunst", "Studium Medizin", "Studium Geschichte", "Studium Psychologie", "Studium Lehramt", "Ausbildung zur Tischler:in", "Ausbildung zur Pflegekraft",
  "Ausbildung zur Köchin oder zum Koch", "Ausbildung im Buchladen", "Aushilfe im Café", "Aushilfe in der Bibliothek", "Praktikum bei der Zeitung", "Freiwilliges Soziales Jahr", "Jobbt im Plattenladen", "Kellner:in am Wochenende", "Lieferdienst-Fahrer:in", "Tutor:in an der Uni",
];
const BERUF_ARBEIT = [
  "Lehrer:in", "Barista", "Tischler:in", "Krankenpfleger:in", "Ärztin oder Arzt", "Journalist:in", "Buchhändler:in", "Bibliothekar:in", "Polizist:in", "Feuerwehrmann oder -frau",
  "Förster:in", "Tierärztin oder Tierarzt", "Bäcker:in", "Köchin oder Koch", "Barkeeper:in", "Fotograf:in", "Grafikdesigner:in", "Softwareentwickler:in", "Elektriker:in", "Mechatroniker:in",
  "Gärtner:in", "Landwirt:in", "Fischer:in", "Antiquar:in", "Restaurator:in", "Archivar:in", "Hausmeister:in", "Taxifahrer:in", "Postbote oder Postbotin", "Apotheker:in",
  "Psychotherapeut:in", "Sozialarbeiter:in", "Musiklehrer:in", "Schauspieler:in", "Tätowierer:in", "Friseur:in", "Detektiv:in", "Rechtsanwalt oder Rechtsanwältin", "Bestatter:in", "Museumsführer:in",
  "Rettungssanitäter:in", "Schornsteinfeger:in", "Imker:in", "Tierpfleger:in", "Nachtwächter:in", "Hotelmanager:in", "Händler:in auf dem Flohmarkt", "Kioskbesitzer:in", "Reiseführer:in", "Studentische Hilfskraft",
];

const EIGENHEITEN = [
  "Summt, wenn sie oder er nachdenkt", "Kommt nie pünktlich", "Trinkt Tee zu jeder Tageszeit", "Hat Angst vor Gewittern", "Sammelt Kugelschreiber aus Hotels", "Redet im Schlaf", "Kann nicht schwimmen", "Isst nie Pilze",
  "Zählt Treppenstufen", "Lacht zu laut", "Trägt immer denselben Schal", "Notiert Träume in einem Heft", "Kaut an Stiften", "Antwortet nie sofort auf Nachrichten", "Liebt Regen", "Hasst Überraschungen",
  "Spricht mit Tieren", "Hat einen schlechten Orientierungssinn", "Vergisst ständig den Schlüssel", "Mag keine Menschenmengen", "Kann nicht lügen", "Macht aus allem einen Witz", "Ist abergläubisch", "Hortet Schokolade",
  "Weiß zu viel über Sternbilder", "Singt unter der Dusche", "Putzt, wenn sie oder er nervös ist", "Trägt Socken in Sandalen", "Liest die letzte Seite zuerst", "Kritzelt in jedes Heft", "Schläft nur mit Licht", "Hört nachts Musik",
  "Wird schnell rot", "Gibt jedem Gegenstand einen Namen", "Isst Pizza mit Besteck", "Kann Geheimnisse nicht lange für sich behalten", "Hat immer Pflaster dabei", "Fährt am liebsten nachts Rad", "Kann stundenlang schweigen", "Ist gnadenlos ehrlich",
  "Verläuft sich in der eigenen Stadt", "Sammelt Muscheln und Steine", "Meidet Spiegel", "Spielt mit Ringen am Finger", "Mag den Geruch von Büchern", "Räumt nie das Zimmer auf", "Telefoniert nur im Gehen", "Ist nachtaktiv",
];

const HAARE = ["Dunkle Locken", "Lange schwarze Haare", "Kurzer blonder Schnitt", "Wilde rote Mähne", "Glatte braune Haare", "Silbergraue Strähnen", "Zotteliger Pferdeschwanz", "Kinnlanger Bob", "Rasierter Kopf", "Lockige blonde Haare", "Dicker Zopf", "Wellige kastanienbraune Haare", "Haare in einem Dutt", "Kurze dunkle Haare", "Bunt gefärbte Spitzen", "Strubbelige Haare"];
const AUGEN = ["graue Augen", "grüne Augen", "braune Augen", "blaue Augen", "bernsteinfarbene Augen", "dunkle Augen", "haselnussbraune Augen", "eisblaue Augen", "Augen verschiedener Farbe", "tiefschwarze Augen"];
const EXTRAS = [
  "Sommersprossen", "eine kleine Narbe an der Augenbraue", "ein schiefes Lächeln", "auffallend blasse Haut", "kräftig gebräunt", "ein Muttermal an der Wange", "ein Piercing in der Nase", "eine Brille mit runden Gläsern", "oft zerzauste Kleidung", "immer ein Hoodie",
  "stets gepflegt und ordentlich", "ein Tattoo am Handgelenk", "sportliche Statur", "schmal und hochgewachsen", "klein und flink", "breite Schultern", "trägt viele Armbänder", "langer Mantel, auch im Sommer", "Ohrringe in verschiedenen Formen", "Grübchen beim Lachen",
];

// Mitgelieferte Einträge als Liste (für Tests und Anzeige); Beruf und Aussehen setzen sich aus Teilen zusammen.
export const BUILTIN_SIZES = { vorname: VORNAMEN.length, nachname: NACHNAMEN.length, spitzname: SPITZNAMEN.length, hobby: HOBBYS.length, eigenheit: EIGENHEITEN.length };
export const BERUF_POOLS = { schule: BERUF_SCHULE, jung: BERUF_JUNG, arbeit: BERUF_ARBEIT };

// ---- Würfeln ----

const clip = (s: string, n: number) => s.slice(0, n);

// Eigene Einträge machen sich bemerkbar, auch wenn es nur wenige sind: bei 8 eigenen Einträgen kommt etwa jeder zweite Wurf daher.
export function pickMixed(builtin: readonly string[], custom: readonly string[] | undefined, rng: Rng): string {
  const own = (custom ?? []).filter((x) => x.trim());
  if (own.length > 0 && rng() < own.length / (own.length + 8)) return pick(own, rng);
  return pick(builtin, rng);
}

export function rollRace(rng: Rng): Race {
  const r = rng();
  return r < 0.7 ? "none" : r < 0.85 ? "werwolf" : "vampir";
}

export const RACE_WORDS: Record<Race, string> = { none: "Mensch", werwolf: "Werwolf", vampir: "Vampir" };

// Alter nach Wesen: Menschen und Werwölfe jung bis mittleres Alter, Vampire deutlich älter.
export function rollAge(race: Race, rng: Rng): number {
  if (race === "vampir") return randInt(rng, 80, 650);
  const r = rng();
  if (race === "werwolf") return r < 0.55 ? randInt(rng, 16, 25) : r < 0.9 ? randInt(rng, 26, 45) : randInt(rng, 46, 60);
  return r < 0.4 ? randInt(rng, 14, 19) : r < 0.7 ? randInt(rng, 20, 29) : r < 0.95 ? randInt(rng, 30, 49) : randInt(rng, 50, 70);
}

// Schule, Studium/Ausbildung oder Beruf je nach Alter.
function berufBuiltin(age: number | null): readonly string[] {
  if (age == null) return [...BERUF_SCHULE, ...BERUF_JUNG, ...BERUF_ARBEIT];
  if (age <= 18) return BERUF_SCHULE;
  if (age <= 25) return BERUF_JUNG;
  return BERUF_ARBEIT;
}

function aussehen(rng: Rng): string {
  const parts = [`${pick(HAARE, rng)}, ${pick(AUGEN, rng)}`];
  if (rng() < 0.7) parts.push(pick(EXTRAS, rng));
  return parts.join(", ");
}

function hobbys(custom: readonly string[] | undefined, rng: Rng): string {
  const wanted = randInt(rng, 2, 4);
  const out: string[] = [];
  for (let tries = 0; out.length < wanted && tries < 30; tries++) {
    const h = pickMixed(HOBBYS, custom, rng);
    if (!out.includes(h)) out.push(h);
  }
  return out.join(", ");
}

export type RollContext = { rng: Rng; custom?: Partial<CustomPools>; race?: Race; age?: number | null; avoid?: ReadonlySet<string> };

// Einen Wert für eine Art von Feld würfeln. `avoid` (kleingeschriebene Vornamen) verhindert Doppelungen mit vorhandenen Namen.
export function rollValue(kind: FieldKind, ctx: RollContext): string {
  const { rng, custom } = ctx;
  switch (kind) {
    case "vorname": {
      for (let i = 0; i < 40; i++) {
        const v = pickMixed(VORNAMEN, custom?.vorname, rng);
        if (!ctx.avoid?.has(v.toLowerCase())) return clip(v, 200);
      }
      return clip(pickMixed(VORNAMEN, custom?.vorname, rng), 200);
    }
    case "nachname":
      return clip(pickMixed(NACHNAMEN, custom?.nachname, rng), 200);
    case "spitzname":
      return clip(pickMixed(SPITZNAMEN, custom?.spitzname, rng), 200);
    case "alter":
      return String(rollAge(ctx.race ?? "none", rng));
    case "wesen":
      return RACE_WORDS[ctx.race ?? rollRace(rng)];
    case "hobby":
      return clip(hobbys(custom?.hobby, rng), 200);
    case "beruf":
      return clip(pickMixed(berufBuiltin(ctx.age ?? null), custom?.beruf, rng), 200);
    case "eigenheit":
      return clip(pickMixed(EIGENHEITEN, custom?.eigenheit, rng), 200);
    case "aussehen": {
      const own = (custom?.aussehen ?? []).filter((x) => x.trim());
      if (own.length > 0 && rng() < own.length / (own.length + 8)) return clip(pick(own, rng), 200);
      return clip(aussehen(rng), 200);
    }
  }
}

// ---- Felder erkennen ----

const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9 /]/g, " ").replace(/\s+/g, " ").trim();

// Welche Art von Angabe steht in einer Zeile? Erkannt wird an der Bezeichnung („Hobbys“, „Beruf / Schule“ …); sonst null (kein Würfel).
export function fieldKind(label: string): FieldKind | null {
  const l = norm(label);
  if (!l) return null;
  if (/^vorname/.test(l) || l === "rufname") return "vorname";
  if (/^(nachname|familienname|zuname)/.test(l)) return "nachname";
  if (/^spitzname|^nickname|^alias$/.test(l)) return "spitzname";
  if (/^alter$/.test(l)) return "alter";
  if (/^(wesen|rasse|spezies|besondere natur|natur)$/.test(l)) return "wesen";
  if (/hobb|interess|freizeit/.test(l)) return "hobby";
  if (/beruf|schule|(^| |\/)ag($| |\/)|job|ausbildung|studium|klasse|tätigkeit|arbeit/.test(l)) return "beruf";
  if (/eigenheit|marotte|macke|angewohnheit|eigenart|schrulle/.test(l)) return "eigenheit";
  if (/aussehen|äußeres|erscheinung/.test(l)) return "aussehen";
  return null;
}

export const FIELD_DEFAULT_LABEL: Record<FieldKind, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  spitzname: "Spitzname",
  alter: "Alter",
  wesen: "Wesen",
  hobby: "Hobbys",
  beruf: "Beruf / Schule / AG",
  eigenheit: "Eigenheiten",
  aussehen: "Aussehen",
};

// Reihenfolge, in der „Alles zufällig“ arbeitet (Alter nach dem Wesen, Beruf nach dem Alter).
export const FIELD_ORDER: FieldKind[] = ["vorname", "nachname", "spitzname", "wesen", "alter", "hobby", "beruf", "eigenheit", "aussehen"];

// Besondere Natur eines Bogens: die gewählte, sonst aus dem Wesen-Feld gelesen.
export function raceOfSheet(data: SheetData): Race {
  if (data.race !== "none") return data.race;
  const wesen = data.personalFields.find((f) => fieldKind(f.label) === "wesen")?.value.toLowerCase() ?? "";
  return wesen.includes("werwolf") ? "werwolf" : wesen.includes("vampir") ? "vampir" : "none";
}

function ageOfSheet(data: SheetData): number | null {
  const v = data.personalFields.find((f) => fieldKind(f.label) === "alter")?.value ?? "";
  const m = /\d+/.exec(v);
  return m ? Number.parseInt(m[0], 10) : null;
}

export function worldNames(characters: { name: string }[]): Set<string> {
  const out = new Set<string>();
  for (const c of characters) {
    const first = c.name.trim().split(/\s+/)[0];
    if (first) out.add(first.toLowerCase());
  }
  return out;
}

function setValue(fields: SheetItem[], index: number, value: string): SheetItem[] {
  return fields.map((f, i) => (i === index ? { ...f, value } : f));
}

// Eine Zeile würfeln (Würfel-Symbol). Beim Wesen wird auch die Besondere Natur samt Boni gesetzt; Alter und Beruf richten sich nach den übrigen Angaben.
export function rollRow(data: SheetData, index: number, custom: Partial<CustomPools> | undefined, rng: Rng, avoid?: ReadonlySet<string>): SheetData {
  const row = data.personalFields[index];
  const kind = row ? fieldKind(row.label) : null;
  if (!kind) return data;
  if (kind === "wesen") {
    const race = rollRace(rng);
    const next = applyRace(data, race);
    return { ...next, personalFields: setValue(next.personalFields, index, RACE_WORDS[race]) };
  }
  const value = rollValue(kind, { rng, custom, race: raceOfSheet(data), age: ageOfSheet(data), avoid });
  return { ...data, personalFields: setValue(data.personalFields, index, value) };
}

// „Alles zufällig“: füllt nur leere bekannte Felder und legt fehlende an; Ausgefülltes bleibt. Beim Wesen setzt der Zufall auch die Besondere Natur.
export function rollAllFields(data: SheetData, custom: Partial<CustomPools> | undefined, rng: Rng, avoid?: ReadonlySet<string>): SheetData {
  let cur: SheetData = { ...data, personalFields: [...data.personalFields] };
  for (const kind of FIELD_ORDER) {
    let index = cur.personalFields.findIndex((f) => fieldKind(f.label) === kind);
    if (index === -1) {
      if (cur.personalFields.length >= MAX_PERSONAL_FIELDS) continue;
      cur = { ...cur, personalFields: [...cur.personalFields, { label: FIELD_DEFAULT_LABEL[kind], value: "" }] };
      index = cur.personalFields.length - 1;
    }
    if (cur.personalFields[index].value.trim()) continue;
    if (kind === "wesen") {
      // Eine schon gewählte Besondere Natur bleibt; sonst würfelt der Zufall sie.
      const race = cur.race !== "none" ? cur.race : rollRace(rng);
      cur = applyRace(cur, race);
      cur = { ...cur, personalFields: setValue(cur.personalFields, index, RACE_WORDS[race]) };
    } else {
      cur = { ...cur, personalFields: setValue(cur.personalFields, index, rollValue(kind, { rng, custom, race: raceOfSheet(cur), age: ageOfSheet(cur), avoid })) };
    }
  }
  return cur;
}

