// Mehrere Figuren in EINER Nachricht: Zeilen, die mit „Name:“ einer eigenen Figur beginnen, werden zu Absätzen mit gekennzeichnetem Sprecher:
//   Felicity: Sie ging die Treppen runter. "Hallo?"
//   Nick: Er sah zu ihr auf. "Hey"
// wird zu <p><span data-type="speaker" data-id="…" class="speaker">Felicity:</span> Sie ging …</p><p>…</p>.
// Ohne passende Zeile bleibt der Text unverändert. Die Funktion ist idempotent (beim Bearbeiten erneut anwendbar).
export type SpeakerCharacter = { id: string; name: string; username?: string | null };

const SPEAKER_SPAN = /<span\b[^>]*data-type="speaker"[^>]*>([\s\S]*?)<\/span>/g;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Welche Namen führen zu welcher Figur: voller Name, Vorname (nur wenn eindeutig) und Benutzername
function buildLookup(characters: SpeakerCharacter[]): Map<string, SpeakerCharacter | null> {
  const lookup = new Map<string, SpeakerCharacter | null>();
  const add = (key: string, c: SpeakerCharacter) => {
    if (!key) return;
    const existing = lookup.get(key);
    if (existing === undefined) lookup.set(key, c);
    else if (existing && existing.id !== c.id) lookup.set(key, null); // doppelt vergeben: nicht eindeutig
  };
  for (const c of characters) {
    add(norm(c.name), c);
    if (c.username) add(norm(c.username), c);
  }
  for (const c of characters) add(norm(c.name.split(" ")[0] ?? ""), c);
  return lookup;
}

export function applySpeakers(html: string, characters: SpeakerCharacter[]): { html: string; speakerIds: string[] } {
  const plain = html.replace(SPEAKER_SPAN, "$1");
  // Nur reine Absatztexte umbauen; Listen, Überschriften, Bilder usw. bleiben unberührt
  if (!/^\s*(?:<p>[\s\S]*?<\/p>\s*)+$/.test(plain)) return { html, speakerIds: parseSpeakerIds(html) };
  const lookup = buildLookup(characters);

  const lines: string[] = [];
  for (const m of plain.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    for (const line of m[1].split(/<br\s*\/?>/i)) lines.push(line);
  }

  const ids: string[] = [];
  let found = false;
  const out = lines.map((line) => {
    const m = /^\s*([^:<>]{1,40}?)\s*:\s*([\s\S]*)$/.exec(line);
    const c = m ? lookup.get(norm(m[1])) : undefined;
    if (!m || !c) return line.trim() ? `<p>${line.trim()}</p>` : "";
    found = true;
    if (!ids.includes(c.id)) ids.push(c.id);
    return `<p><span data-type="speaker" data-id="${c.id}" class="speaker">${escapeHtml(c.name)}:</span> ${m[2].trim()}</p>`;
  });
  if (!found) return { html, speakerIds: [] };
  return { html: out.filter(Boolean).join(""), speakerIds: ids };
}

// Sprecher einer Nachricht aus dem gespeicherten HTML (Reihenfolge des Auftretens)
export function parseSpeakerIds(html: string): string[] {
  const ids: string[] = [];
  for (const tag of html.matchAll(/<span\b[^>]*>/g)) {
    if (!/data-type="speaker"/.test(tag[0])) continue;
    const id = /data-id="([0-9a-f-]{36})"/.exec(tag[0])?.[1];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
