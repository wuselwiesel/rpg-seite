// Besetzung einer Welt: Rollen (zum Beispiel Figuren einer Serie), ihr Stand und der Import aus Wiki-Listen.
// Reine Funktionen ohne Datenbank, damit Server und Oberfläche dasselbe benutzen und alles testbar bleibt.

export type CastState = "open" | "npc";
export type CastHolderKind = "reserved" | "approved";
export type CastStatus = "free" | "reserved" | "taken" | "npc";

export type CastRole = {
  id: string;
  name: string;
  age_text: string | null;
  species_text: string | null;
  source: string | null;
  description: string | null;
  deceased: boolean;
  state: CastState;
  holder_user: string | null;
  holder_label: string | null;
  holder_kind: CastHolderKind | null;
  holder_until: string | null;
  character_id: string | null;
};

export type LinkedCharacter = { deleted: boolean; vacant: boolean };

// Frei, reserviert/zugesagt, vergeben oder NPC. Muss zu `_role_is_available` in der Datenbank passen.
export function castStatus(role: Pick<CastRole, "state" | "holder_kind" | "holder_until">, linked: LinkedCharacter | null, now: Date = new Date()): CastStatus {
  if (role.state === "npc") return "npc";
  if (linked && !linked.deleted && !linked.vacant) return "taken";
  if (role.holder_kind === "approved") return "reserved";
  if (role.holder_kind === "reserved") {
    if (!role.holder_until) return "reserved";
    return new Date(role.holder_until).getTime() > now.getTime() ? "reserved" : "free";
  }
  return "free";
}

// Buchstabe für die A–Z-Leiste (Umlaute zählen zum Grundbuchstaben, alles andere unter „#“)
export function castLetter(name: string): string {
  const cleaned = name.replace(/^[\s†"„“”'‚‘’()]+/, "");
  const first = cleaned.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

export type ParsedRole = {
  name: string;
  age_text: string | null;
  species_text: string | null;
  source: string | null;
  description: string | null;
  deceased: boolean;
  // false: das Format wurde nicht erkannt, es steht nur der Anfang als Name da
  recognized: boolean;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function clip(s: string | null | undefined, max: number): string | null {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : null;
}

// Eine Zeile im Format „† Name (Alter) → Wesen (Beschreibung) [Serie]“
export function parseCastLine(raw: string): ParsedRole | null {
  let text = decodeEntities(raw.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  if (!text) return null;
  let deceased = false;
  if (text.startsWith("†")) {
    deceased = true;
    text = text.replace(/^†\s*/, "");
  }
  let source: string | null = null;
  const src = text.match(/\[([^\]]+)\]\s*$/);
  if (src) {
    source = src[1].trim();
    text = text.slice(0, src.index).trim();
  }
  const arrow = text.indexOf("→");
  if (arrow < 0) {
    const name = text.split(" (")[0].trim();
    if (!name) return null;
    return { name: name.slice(0, 160), age_text: null, species_text: null, source: clip(source, 60), description: clip(text.slice(name.length), 2000), deceased, recognized: false };
  }
  const left = text.slice(0, arrow).trim();
  const right = text.slice(arrow + 1).trim();
  const ageMatch = left.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const name = (ageMatch ? ageMatch[1] : left).trim();
  const age = ageMatch ? ageMatch[2].trim() : null;
  if (!name) return null;
  const open = right.indexOf("(");
  let species = right;
  let description: string | null = null;
  if (open >= 0) {
    species = right.slice(0, open).trim();
    description = right.slice(open + 1).replace(/\)\s*$/, "").trim();
  }
  return { name: name.slice(0, 160), age_text: clip(age, 60), species_text: clip(species, 120), source: clip(source, 60), description: clip(description, 2000), deceased, recognized: true };
}

// Alle Listenpunkte einer Wiki-Seite (HTML) als Rollen
export function parseCastHtml(html: string): ParsedRole[] {
  const out: ParsedRole[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const role = parseCastLine(m[1]);
    if (role) out.push(role);
  }
  return out;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[„“”"'‚‘’.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Vorschläge, welcher bestehende Charakter zu welcher Rolle gehört: gleicher Name, oder Charaktername ist der Anfang des Rollennamens
// (zum Beispiel „Damon“ zu „Damon Salvatore“). Jeder Charakter und jede Rolle höchstens einmal, nur eindeutige Treffer.
export function suggestLinks(roles: { key: string; name: string }[], characters: { id: string; name: string }[]): { roleKey: string; characterId: string }[] {
  const out: { roleKey: string; characterId: string }[] = [];
  const usedChars = new Set<string>();
  const usedRoles = new Set<string>();
  const tryMatch = (test: (roleName: string, charName: string) => boolean) => {
    for (const c of characters) {
      if (usedChars.has(c.id)) continue;
      const cn = norm(c.name);
      if (!cn) continue;
      const hits = roles.filter((r) => !usedRoles.has(r.key) && test(norm(r.name), cn));
      if (hits.length === 1) {
        out.push({ roleKey: hits[0].key, characterId: c.id });
        usedChars.add(c.id);
        usedRoles.add(hits[0].key);
      }
    }
  };
  tryMatch((rn, cn) => rn === cn);
  tryMatch((rn, cn) => rn.startsWith(`${cn} `) || cn.startsWith(`${rn} `));
  return out;
}
