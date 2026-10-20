// Bildschirmfotos für die Anleitung: echte Oberflächen mit den Daten der Welt „Schattenmoor“ (?screen=szene|chabo|netz|wuerfeln|schreiben|wurfzeilen|karte).
import { createRoot } from "react-dom/client";
import { Chabo } from "@/components/chabo/chabo";
import { normalizeSheet } from "@/lib/sheet-rules";
import { RelationshipGraph } from "@/app/characters/relationships/relationship-graph";
import { StoryEntryItem } from "@/app/story/[id]/story-entry-item";
import { StoryComposer } from "@/app/story/[id]/story-composer";
import { CustomEmojiProvider } from "@/components/custom-emoji-provider";
import { MapViewer } from "@/app/wiki/karten/[id]/map-viewer";
import avatars from "./avatars.json";
import type { Character, CharacterRelationship, StoryEntry } from "@/lib/types";

const params = new URLSearchParams(location.search);
const screen = params.get("screen") ?? "szene";
const pad = params.get("schmal") ? 8 : 16;
const av = avatars as Record<string, string>;

const mk = (id: string, name: string, house: string | null = null) =>
  ({ id, owner_id: "u1", world_id: "w", name, avatar_url: av[name], bio: null, sheet_url: null, house }) as unknown as Character;
const dorian = mk("dorian", "Dorian Blackwood", "Haus Nachtsang");
const vesper = mk("vesper", "Vesper Nachtsang", "Haus Nachtsang");
const ysolde = mk("ysolde", "Ysolde Nachtsang", "Haus Nachtsang");
const seraphine = mk("seraphine", "Seraphine Vael", "Haus Vael");
const tamsin = mk("tamsin", "Tamsin Wermut", "Orden der Nachtwächter");
const pia = mk("pia", "Pia Aschenbach");
const elowen = mk("elowen", "Elowen Lichtwehr", "Kapelle von Schattenmoor");
const morwenna = mk("morwenna", "Morwenna Krähenhall", "Kloster Sankt Veyr");
const iselin = mk("iselin", "Iselin Moorfeld");
const all = [dorian, vesper, ysolde, seraphine, tamsin, pia, elowen, morwenna, iselin];

const sheet = {
  race: "none",
  family: [{ label: "Schwester", value: "Ysolde Vael" }],
  attrBasis: { CH: "11", FF: "9", GE: "9", GL: "10", IG: "10", IN: "12", KK: "6", KO: "9", MU: "11", SB: "7" },
  attrBonus: { IN: "2", MU: "3", SB: "-2" },
  familyTitle: "Beziehungen",
  notesBlocks: [{ html: "<p>Seraphine kennt jeden Pfad durch den Nebel. Wer sie um Rat fragt, zahlt mit einer Erinnerung.</p>", label: "Geschichte" }],
  talentBasis: {},
  talentBonus: {},
  luckPointsUsed: 0,
  personalFields: [
    { label: "Titel", value: "Moorhexe" },
    { label: "Vorname", value: "Seraphine" },
    { label: "Nachname", value: "Vael" },
    { label: "Alter", value: "212" },
    { label: "Wesen", value: "Moorhexe" },
    { label: "Rang", value: "Älteste des Moors" },
  ],
  portraitUrl: av["Seraphine Vael"],
};
(window as unknown as { __sheets: Record<string, unknown> }).__sheets = { seraphine: sheet };

function entry(id: string, c: Character, html: string, min: number, extra: Partial<StoryEntry> = {}): StoryEntry {
  return { id, story_post_id: "s1", character_id: c.id, content: html, created_at: new Date(Date.now() - min * 60000).toISOString(), characters: c, kind: "entry", ...extra } as StoryEntry;
}
const roll = (v: number | null, bonus: number | null, die: number, res: number, ok: boolean | null, extra: Partial<StoryEntry> = {}): Partial<StoryEntry> => ({
  roll_value: v, roll_bonus: bonus, roll_die: die, roll_result: res, roll_success: ok, ...extra,
});

function Row({ e }: { e: StoryEntry }) {
  return <StoryEntryItem entry={e} storyPostId="s1" canManage={false} mentionCharacters={all} displayHtml={e.content} ownCharacters={[seraphine]} />;
}

function Scene() {
  const entries: StoryEntry[] = [
    entry("e1", dorian, "<p>Dorian Blackwood stand im Türrahmen, als hätte er dort schon immer gestanden. Der Kerzenschein fing sich in seinen dunklen Augen, und für einen Moment glomm darin etwas Rotes. „Ihr solltet um diese Stunde nicht allein zwischen alten Büchern sitzen, Archivarin“, sagte er mit jener Höflichkeit, die schlimmer war als jede Drohung. „Man verliert so leicht Seiten.“</p>", 190),
    entry("e2", vesper, "", 189, { roll_label: "Dorians Blick standhalten", ...roll(14, null, 20, 5, true) }),
    entry("e3", seraphine, "<p>Ein Windstoß riss das Fenster auf, und Nebel kroch über die Dielen. Seraphine Vael saß plötzlich auf dem Sims, die goldenen Augen halb geschlossen, Moor an den bloßen Füßen. „Streitet ihr schon wieder um Dinge, die mir längst gehören?“, fragte sie leise. „Die Seite, Vesper. Ich habe sie. Und ich weiß, was darauf steht.“</p>", 188),
    entry("e4", seraphine, "", 187, { roll_label: "Den Nebel beschwören", ...roll(16, null, 20, 10, true) }),
    entry("e5", dorian, "<p>Dorian lächelte, und im Kerzenlicht blitzte etwas Weißes. „Ihr überschätzt eure Lage, meine Damen“, murmelte er. „Die dritte Seite lag nie im Archiv. Sie liegt in meinem Keller – und sie schreibt sich selbst weiter.“</p>", 120),
    entry("e6", dorian, "", 119, { roll_label: "Die Kerzen löschen", ...roll(12, null, 20, 20, false) }),
  ];
  return (
    <div id="shot" style={{ maxWidth: 720, padding: pad }} className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h1 className="font-serif text-2xl text-fg">Die Glocke von Schattenmoor</h1>
        <p className="text-sm text-muted">Schattenmoor · Szene mit 3 Figuren</p>
      </div>
      {entries.map((e) => <Row key={e.id} e={e} />)}
    </div>
  );
}

function RollRows() {
  const rows: StoryEntry[] = [
    entry("r1", vesper, "", 30, { roll_label: "Dorians Blick standhalten", ...roll(14, null, 20, 5, true) }),
    entry("r2", dorian, "", 29, { roll_label: "Die Kerzen löschen", ...roll(12, null, 20, 20, false) }),
    entry("r3", seraphine, "", 28, { roll_label: "Pfad durch den Nebel", roll_stat_name: "Intuition", ...roll(14, 2, 20, 11, true, { roll_luck_remaining: 3 }) }),
    entry("r4", vesper, "", 27, { roll_label: "Flüsterwort verstehen", ...roll(16, null, 20, 3, true, { roll_target_character_id: "dorian", roll_target_character: { name: "Dorian Blackwood" } }) }),
    entry("r5", dorian, "", 26, { roll_label: "Wein vertragen", ...roll(14, -6, 20, 17, false, { roll_condition: "Betrunken (stark)", roll_luck_remaining: 2 }) }),
    entry("r6", tamsin, "", 25, { roll_label: "Wer lacht da im Nebel?", ...roll(null, null, 6, 4, null) }),
  ];
  return (
    <div id="shot" style={{ maxWidth: 720, padding: pad }} className="flex flex-col gap-2">
      {rows.map((e) => <Row key={e.id} e={e} />)}
    </div>
  );
}

function ChaboScreen() {
  return (
    <div id="shot" style={{ maxWidth: 1000, padding: pad }}>
      <Chabo characterId="seraphine" characterName="Seraphine Vael" initial={{ ...normalizeSheet(sheet), portraitUrl: av["Seraphine Vael"] } as never} editable={false} />
    </div>
  );
}

function Net() {
  const R = (i: number, a: Character, b: Character, type: string, color: string, category: string) =>
    ({ id: `r${i}`, world_id: "w", character_a_id: a.id, character_b_id: b.id, type, color, label: null, category, family_role: null, created_by: "u", created_at: new Date().toISOString() }) as CharacterRelationship;
  const rels = [
    R(1, vesper, dorian, "Verfeindet", "#b23a48", "rivalitaet"),
    R(2, dorian, seraphine, "Rivalen", "#c9822b", "rivalitaet"),
    R(3, vesper, seraphine, "Verbündet", "#3a8f5c", "buendnis"),
    R(4, vesper, dorian, "Mutter und Sohn", "#b07a4a", "familie"),
    R(5, vesper, seraphine, "Ehepaar", "#b07a4a", "familie"),
    R(6, ysolde, vesper, "Geschwister", "#9a9a9a", "familie"),
    R(7, tamsin, pia, "Freundinnen", "#9a9a9a", "freundschaft"),
    R(8, iselin, seraphine, "Verbündet", "#9a9a9a", "buendnis"),
    R(9, morwenna, dorian, "Verfeindet", "#9a9a9a", "rivalitaet"),
    R(10, elowen, pia, "Heimliche Liebe", "#9a9a9a", "liebe"),
    R(11, tamsin, morwenna, "Misstrauen", "#9a9a9a", "sonstiges"),
    R(12, ysolde, dorian, "Schuldner", "#9a9a9a", "sonstiges"),
  ];
  const focus = params.get("fokus");
  return (
    <div id="shot" style={{ maxWidth: 900, padding: pad }}>
      <RelationshipGraph characters={all} relationships={rels} history={[]} initialFocusId={focus} />
    </div>
  );
}

function Composer() {
  return (
    <div id="shot" style={{ maxWidth: 560, padding: pad }}>
      <StoryComposer storyPostId="s1" worldId="w" ownCharacters={[seraphine, vesper, ysolde]} activeCharacterId="seraphine" characters={all} participantIds={["seraphine", "vesper", "dorian", "ysolde"]} calendar={{ months: [], weekdays: [] } as never} locations={[]} sceneLocation={null} userId="u1" worldMembers={[]} />
    </div>
  );
}

function MapScreen() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7d9de"/><stop offset="1" stop-color="#a9adb8"/></linearGradient></defs><rect width="900" height="560" fill="url(#g)"/><path d="M120 150 Q260 50 450 110 T780 190 Q850 340 690 450 T300 490 Q90 440 120 150Z" fill="#8fa383" stroke="#6b7d62" stroke-width="4"/><path d="M200 330 Q330 280 440 300 T700 260" stroke="#6b7d62" stroke-width="3" fill="none" stroke-dasharray="6 6"/></svg>`;
  const map = { id: "m1", world_id: "w", title: "Schattenmoor und Umgebung", description: null, image_url: "data:image/svg+xml;utf8," + encodeURIComponent(svg), created_by: "u", created_at: "", updated_at: "" };
  const pins = [
    { id: "p1", map_id: "m1", x: 30, y: 52, label: "Das Gutshaus Blackwood", icon: "🏚️", page_id: "pg1", target_map_id: null },
    { id: "p2", map_id: "m1", x: 58, y: 34, label: "Die Kapelle von Schattenmoor", icon: "⛪", page_id: "pg2", target_map_id: null },
    { id: "p3", map_id: "m1", x: 44, y: 72, label: "Schattenbibliothek", icon: "📚", page_id: "pg3", target_map_id: null },
  ];
  return (
    <CustomEmojiProvider map={{}}>
      <div id="shot" style={{ maxWidth: 900, padding: pad }}>
        <MapViewer map={map as never} initialPins={pins as never} pages={[{ id: "pg1", title: "Das Gutshaus Blackwood" }, { id: "pg2", title: "Die Kapelle von Schattenmoor" }, { id: "pg3", title: "Schattenbibliothek" }]} otherMaps={[]} />
      </div>
    </CustomEmojiProvider>
  );
}

const screens: Record<string, () => React.JSX.Element> = { szene: Scene, wurfzeilen: RollRows, chabo: ChaboScreen, netz: Net, wuerfeln: Composer, schreiben: Composer, karte: MapScreen };
const Screen = screens[screen] ?? Scene;
createRoot(document.getElementById("root")!).render(<Screen />);
