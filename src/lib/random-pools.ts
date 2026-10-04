// Zufallsfelder für den ChaBo (Name, Alter, Wesen, Hobbys, Beruf/Schule, Eigenheiten, Lebensziel, Geheimnis, Größte Angst): mitgelieferte Listen (Namen englisch, amerikanisch, irisch; Rest deutsch) für eine
// moderne Schul- und Alltagswelt mit Wesen, dazu eigene Einträge je Welt (siehe world_random_entries), die eingemischt werden.
// Rein; die Zufallsquelle kommt als Parameter (`Rng`), damit Tests mit festem Seed laufen.
import { pick, randInt, type Rng } from "@/lib/sheet-random";
import { MAX_PERSONAL_FIELDS, applyRace, type Race, type SheetData, type SheetItem } from "@/lib/sheet-rules";

export const POOL_KINDS = ["vorname", "nachname", "spitzname", "hobby", "beruf", "eigenheit", "lebensziel", "geheimnis", "angst"] as const;
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
  lebensziel: "Lebensziel / Wunsch",
  geheimnis: "Geheimnisse",
  angst: "Größte Ängste",
};

export function emptyCustomPools(): CustomPools {
  return { vorname: [], nachname: [], spitzname: [], hobby: [], beruf: [], eigenheit: [], lebensziel: [], geheimnis: [], angst: [] };
}

// ---- mitgelieferte Listen ----

const VORNAMEN = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Lucas", "Mia", "Logan", "Charlotte", "James", "Amelia", "Henry", "Harper", "Jack", "Evelyn", "Owen",
  "Abigail", "Caleb", "Ella", "Wyatt", "Scarlett", "Nathan", "Grace", "Isaac", "Chloe", "Dylan", "Lily", "Ryan", "Hannah", "Tyler", "Zoe", "Hunter", "Nora", "Connor", "Riley", "Jordan",
  "Aoife", "Ciaran", "Saoirse", "Niamh", "Cillian", "Siobhan", "Declan", "Roisin", "Oisin", "Maeve", "Fionn", "Aisling", "Cormac", "Orla", "Eoin", "Caoimhe", "Padraig", "Brigid", "Finnegan", "Eilish",
  "Thomas", "Eleanor", "Oliver", "Beatrice", "George", "Florence", "Arthur", "Matilda", "Alfie", "Poppy", "Freddie", "Imogen", "Harry", "Daisy", "Archie", "Rosie", "Edward", "Lucy", "Oscar", "Ivy",
  "William", "Violet", "Benjamin", "Hazel", "Elijah", "Willow", "Samuel", "Piper", "Sebastian", "Stella", "Gabriel", "Savannah", "Julian", "Aurora", "Brooklyn", "Cole", "Paisley", "Jesse", "Quinn", "Rory",
  "Kieran", "Shane", "Brendan", "Sinead", "Una", "Tara", "Keira", "Alannah", "Colm",
];

const NACHNAMEN = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis",
  "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson", "Hill", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips", "Evans", "Turner", "Parker",
  "Murphy", "Kelly", "O'Brien", "Walsh", "Ryan", "O'Connor", "Byrne", "Doyle", "McCarthy", "Gallagher", "Kennedy", "Lynch", "Murray", "Quinn", "McLoughlin", "Fitzgerald", "Brennan", "Sullivan", "Healy", "Cooper",
  "Morgan", "Bell", "Bailey", "Cook", "Reed", "Foster", "Hughes", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hayes",
  "Fletcher", "Harrison", "Palmer", "Stone", "Hunt", "Ashford", "Blackwood", "Whitaker", "Hawthorne", "Fairfax", "Sinclair", "Thornton", "Ellis", "Holloway", "Wells", "Marsh", "Rowan", "Calloway", "Ward",
];

const SPITZNAMEN = [
  "Lu", "Fix", "Mimi", "Dino", "Sparrow", "Bear", "Fox", "Cap", "Shadow", "Spark", "Night", "Bolt", "Cookie", "Pixel", "Bug", "Muffin", "Tiny", "Bunny", "Lottie", "Pug",
  "Bee", "Crumb", "Raven", "Flo", "Ink", "Whirl", "Sunny", "Moon", "Pete", "Joe", "Mouse", "Hedge", "Fluff", "Nutmeg", "Dolly", "Lynx", "Cloud", "Grizzly", "Smalls", "Tiger",
  "Kiwi", "Cinnamon", "Pepper", "Curly", "Flake", "Rascal", "Imp", "Firefly", "Woody", "Mist", "Badger", "Tomcat", "Magpie", "Sputnik", "Boss", "Doc", "Ziggy", "Mo", "Nell", "Banjo",
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

const LEBENSZIELE = [
  "Will die Stadt verlassen und neu anfangen", "Sucht jemanden aus der Vergangenheit", "Möchte endlich dazugehören", "Will beweisen, dass alle sich in ihr oder ihm irren", "Träumt von einem eigenen Laden", "Will die Wahrheit über die eigene Familie herausfinden",
  "Möchte einmal die Welt umrunden", "Will ein Buch veröffentlichen", "Sehnt sich nach einem ruhigen Leben", "Will jemanden beschützen, der ihr oder ihm wichtig ist", "Möchte die eigene Natur verstehen und akzeptieren", "Will sich mit der Familie versöhnen",
  "Träumt davon, Musik zum Beruf zu machen", "Will nie wieder allein sein", "Möchte ein Unrecht von früher wiedergutmachen", "Will einen Ort finden, der sich wie Zuhause anfühlt", "Möchte das Studium oder die Ausbildung schaffen", "Will stärker werden, körperlich und innerlich",
  "Sucht nach einem Heilmittel", "Möchte einmal im Leben wirklich frei sein", "Will die große Liebe finden", "Möchte die Menschen in der Stadt vor einer Gefahr warnen", "Will das Vermächtnis der Großeltern bewahren", "Möchte endlich keine Geheimnisse mehr haben",
  "Will einen eigenen Weg gehen, unabhängig von der Familie", "Träumt davon, ein Haus am Meer zu besitzen", "Will ein Rätsel lösen, das sie oder ihn seit Jahren verfolgt", "Möchte wenigstens einmal ganz sie oder er selbst sein", "Will jemandem verzeihen können", "Möchte etwas Bleibendes erschaffen",
];

const GEHEIMNISSE = [
  "Hat als Kind etwas gesehen, worüber sie oder er nie spricht", "Ist heimlich in die beste Freundin oder den besten Freund verliebt", "Hat ein Tagebuch, das niemand finden darf", "Schleicht sich nachts aus dem Haus", "Ist nicht der Mensch, für den alle sie oder ihn halten",
  "Hat einmal jemanden im Stich gelassen", "Kennt den wahren Grund für einen alten Unfall", "Wurde einmal von der Schule verwiesen und hat es verschwiegen", "Schreibt anonym Briefe oder Texte", "Hat Schulden, von denen niemand weiß",
  "Besitzt einen Gegenstand, der der Familie nicht gehört", "Hat die eigene Herkunft erfunden", "Weiß, wer hinter einem Gerücht der Stadt steckt", "Trifft sich heimlich mit jemandem, den die Familie nicht mag", "Hat bei einer wichtigen Prüfung geschummelt",
  "Verliert in manchen Nächten die Kontrolle", "Hört Stimmen, die sonst niemand hört", "Hat ein Versprechen gebrochen, das ihr oder ihm alles bedeutete", "Kann etwas, das sie oder er niemandem zeigt", "Ist heimlich auf der Suche nach den leiblichen Eltern",
  "Hat jemandem das Leben gerettet und es nie erzählt", "Führt ein zweites Leben unter anderem Namen", "Hat einen Brief, den sie oder er nie abgeschickt hat", "Weiß mehr über das Verschwinden von früher, als sie oder er zugibt", "Trägt eine Narbe, deren Geschichte niemand kennt",
  "Hat einmal etwas gestohlen und es nie zurückgegeben", "Fürchtet, dass die eigene Natur entdeckt wird", "Ist bei jemandem in der Schuld und will es nicht zeigen", "Hat sich vor langer Zeit mit dem besten Freund oder der besten Freundin überworfen, aus Stolz", "Verbirgt eine Krankheit vor allen",
];

const AENGSTE = [
  "Die Dunkelheit", "Vergessen zu werden", "Die Kontrolle zu verlieren", "Allein zurückgelassen zu werden", "Enttäuschung bei den Eltern auszulösen", "Tiefes Wasser",
  "Dass die eigene Natur entdeckt wird", "Menschen zu verletzen, die ihr oder ihm nahestehen", "Enge Räume", "Der Vollmond", "Zu versagen, wenn es darauf ankommt", "Dass niemand ihr oder ihm wirklich zuhört",
  "Gewitter und Sturm", "Alt zu werden und nichts erreicht zu haben", "Die eigene Vergangenheit", "Blut", "Von anderen durchschaut zu werden", "Verrat durch einen engen Freund oder eine enge Freundin",
  "Feuer", "Zurückgewiesen zu werden", "Große Höhen", "Das Alleinsein in großen, leeren Häusern", "Ein Versprechen nicht halten zu können", "Dass jemand anderes für ihre oder seine Fehler büßt",
  "Aufmerksamkeit in großen Gruppen", "Albträume, die sich wiederholen", "Den Verlust der Menschlichkeit", "Dass die Familie auseinanderbricht", "Spiegel in der Nacht", "Nie ein Zuhause zu finden",
];

// Mitgelieferte Einträge als Liste (für Tests und Anzeige); Beruf setzt sich aus Teilen zusammen.
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
    case "lebensziel":
      return clip(pickMixed(LEBENSZIELE, custom?.lebensziel, rng), 200);
    case "geheimnis":
      return clip(pickMixed(GEHEIMNISSE, custom?.geheimnis, rng), 200);
    case "angst":
      return clip(pickMixed(AENGSTE, custom?.angst, rng), 200);
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
  if (/lebensziel|wunsch|traum|ziel/.test(l)) return "lebensziel";
  if (/geheimnis/.test(l)) return "geheimnis";
  if (/angst|furcht|phobie/.test(l)) return "angst";
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
  lebensziel: "Lebensziel / Wunsch",
  geheimnis: "Geheimnis",
  angst: "Größte Angst",
};

// Reihenfolge, in der „Alles zufällig“ arbeitet (Alter nach dem Wesen, Beruf nach dem Alter).
export const FIELD_ORDER: FieldKind[] = ["vorname", "nachname", "spitzname", "wesen", "alter", "hobby", "beruf", "eigenheit", "lebensziel", "geheimnis", "angst"];

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

