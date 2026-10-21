// Bildschirmfotos für die Anleitung: echte Oberflächen mit den Daten der Welt „Schattenmoor“ (?screen=szene|chabo|netz|wuerfeln|schreiben|wurfzeilen|karte).
import { createRoot } from "react-dom/client";
import { Chabo } from "@/components/chabo/chabo";
import { normalizeSheet } from "@/lib/sheet-rules";
import { RelationshipGraph } from "@/app/characters/relationships/relationship-graph";
import { StoryEntryItem } from "@/app/story/[id]/story-entry-item";
import { StoryComposer } from "@/app/story/[id]/story-composer";
import { CustomEmojiProvider } from "@/components/custom-emoji-provider";
import { MapViewer } from "@/app/wiki/karten/[id]/map-viewer";
import { TicketListView, type ListTicket } from "@/app/redaktion/tickets/ticket-list-view";
import { Thread } from "@/app/redaktion/tickets/[id]/thread";
import { CastView } from "@/app/wiki/besetzung/cast-view";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { TicketComment, TicketRow } from "@/lib/tickets";
import avatars from "./avatars.json";
import type { Character, CharacterRelationship, StoryEntry } from "@/lib/types";

const params = new URLSearchParams(location.search);
const screen = params.get("screen") ?? "szene";
const pad = params.get("schmal") ? 8 : 16;
const nodice = params.has("nodice");
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
      {entries.filter((e) => !(nodice && e.roll_label)).map((e) => <Row key={e.id} e={e} />)}
    </div>
  );
}

function Scene2() {
  const entries: StoryEntry[] = [
    entry("n1", vesper, "<p>Vesper schob die Tür auf. Drinnen roch es nach Kerzenwachs und frischem Brot. „Du bist spät“, sagte sie, ohne aufzusehen. „Wir haben schon angefangen.“</p>", 90),
    entry("n2", dorian, "<p>Dorian lächelte und hängte seinen Mantel an den Haken. „Spät, aber nicht zu spät. Ich bringe Neuigkeiten.“</p>", 80),
    entry("n3", vesper, "", 79, { roll_label: "Eine Lüge durchschauen", ...roll(14, null, 20, 5, true) }),
    entry("n4", seraphine, "<p>Seraphine lehnte am Fenster und drehte einen Brief zwischen den Fingern. „Neuigkeiten“, wiederholte sie leise. „Dann hoffe ich, es sind gute.“</p>", 60),
  ];
  return (
    <div id="shot" style={{ maxWidth: 720, padding: pad }} className="flex flex-col gap-3">
      {entries.map((e) => <Row key={e.id} e={e} />)}
    </div>
  );
}

function YesNoRows() {
  const rows: StoryEntry[] = [
    entry("j1", vesper, "", 30, { roll_label: "Folgt uns jemand?", roll_kind: "yesno", roll_die: 2, roll_result: 1, roll_success: true }),
    entry("j2", dorian, "", 29, { roll_label: "Ist die Tür verschlossen?", roll_kind: "yesno", roll_die: 2, roll_result: 2, roll_success: false }),
    entry("j3", seraphine, "", 28, { roll_label: "Lügt er?", roll_kind: "yesno", roll_secret: true, roll_die: 2, roll_result: 1, roll_success: true }),
  ];
  return (
    <div id="shot" style={{ maxWidth: 720, padding: pad }} className="flex flex-col gap-2">
      {rows.map((e) => <Row key={e.id} e={e} />)}
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
      <Chabo diceEnabled={!nodice} characterId="seraphine" characterName="Seraphine Vael" initial={{ ...normalizeSheet(sheet), portraitUrl: av["Seraphine Vael"] } as never} editable={false} />
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
      <StoryComposer diceEnabled={!nodice} storyPostId="s1" worldId="w" ownCharacters={[seraphine, vesper, ysolde]} activeCharacterId="seraphine" characters={all} participantIds={["seraphine", "vesper", "dorian", "ysolde"]} calendar={{ months: [], weekdays: [] } as never} locations={[]} sceneLocation={null} userId="u1" worldMembers={[]} />
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

function TicketsList() {
  const list: ListTicket[] = [
    { id: "t12", number: 12, kind: "bug", title: "Bild und Text verschmelzen", status: "open", mine: true, last_actor: "admin", updated_at: "2026-10-17T10:00:00Z", read_at: null, by: "Vesper", urgent: false, category: "scene" },
    { id: "t11", number: 11, kind: "wish", title: "Dunkler Modus für den Editor", status: "working", mine: true, last_actor: "me", updated_at: "2026-10-16T09:00:00Z", read_at: null, by: "Vesper", urgent: false, category: null },
    { id: "t10", number: 10, kind: "question", title: "Wie lösche ich mein Konto?", status: "done", mine: false, last_actor: "other", updated_at: "2026-10-15T09:00:00Z", read_at: "2026-10-15T10:00:00Z", by: "Tamsin", urgent: false, category: null },
    { id: "t9", number: 9, kind: "bug", title: "Chat scrollt nicht", status: "open", mine: false, last_actor: "other", updated_at: "2026-10-14T09:00:00Z", read_at: null, by: "Pia", urgent: true, category: "chat" },
  ];
  return <div id="shot" style={{ maxWidth: 420, padding: 16 }}><TicketListView tickets={list} userId="me" admin={false} /></div>;
}
function TicketThread() {
  const T = "t12";
  const ticket: TicketRow = { id: T, number: 12, last_actor: "admin", images: [], created_by: "me", kind: "bug", title: "Bild und Text verschmelzen", body: "Wenn zwei Figuren in einer Nachricht stehen, wirken Bild und Text fast verbunden.", status: "working", page_path: "/story/glocke", device: "iPhone · Safari · 375×700", created_at: "2026-10-17T09:00:00Z", updated_at: "2026-10-17T10:00:00Z", closed_at: null, urgent: false, category: "scene", merged_into: null } as TicketRow;
  const comments: TicketComment[] = [
    { id: "c0", ticket_id: T, author_id: "admin", body: "In Arbeit", images: [], internal: false, system: "status", created_at: "2026-10-17T09:20:00Z" },
    { id: "c1", ticket_id: T, author_id: "admin", body: "Danke, ich schaue es mir an.", images: [], internal: false, system: null, created_at: "2026-10-17T09:30:00Z" },
  ];
  return <div id="shot" style={{ maxWidth: 640, padding: 8 }}><Thread ticket={ticket} comments={comments} names={{ me: "Vesper", admin: "Betreiberin" }} userId="me" admin={false} /></div>;
}
function Besetzung() {
  const R = (i: number, name: string, extra: Record<string, unknown>) => ({ id: `r${i}`, name, age_text: null, species_text: null, source: null, description: null, deceased: false, state: "open", holder_user: null, holder_label: null, holder_kind: null, holder_until: null, character_id: null, status: "free", character: null, holderName: null, holderIsMe: false, myRequestId: null, requests: [], ...extra });
  const rows = [
    R(1, "Dorian Blackwood", { species_text: "Vampir", description: "Uralter Gutsherr von Schattenmoor.", status: "taken", character: { id: "dorian", name: "Dorian Blackwood", avatarUrl: av["Dorian Blackwood"], ownerName: "Nadine", vacant: false } }),
    R(2, "Elowen Lichtwehr", { species_text: "Mensch", description: "Kerzenmacherin der Kapelle.", status: "free" }),
    R(3, "Iselin Moorfeld", { species_text: "Mensch", description: "Kräuterfrau und Hebamme.", status: "free", myRequestId: "rq1" }),
    R(4, "Morwenna Krähenhall", { species_text: "Vampir", description: "Letzte Schwester des Klosters Sankt Veyr.", status: "taken", character: { id: "morwenna", name: "Morwenna Krähenhall", avatarUrl: av["Morwenna Krähenhall"], ownerName: "Sani", vacant: false } }),
    R(5, "Pia Aschenbach", { species_text: "Mensch", description: "Singt auf dem Marktplatz für Brot.", status: "reserved", holder_kind: "approved", holderName: "Mira", holder_label: "Mira" }),
    R(6, "Seraphine Vael", { species_text: "Moorhexe", description: "Kennt jeden Pfad durch den Nebel.", status: "taken", character: { id: "seraphine", name: "Seraphine Vael", avatarUrl: av["Seraphine Vael"], ownerName: "Emilie", vacant: false } }),
    R(7, "Tamsin Wermut", { species_text: "Mensch", description: "Nachtwächterin im Orden.", status: "free" }),
    R(8, "Die Moorwächterin", { species_text: "Wesen", description: "Sitzt auf einem Findling am Moorrand.", state: "npc", status: "npc" }),
  ];
  const data = { enabled: true, isAdmin: false, rows, members: [], characters: [] } as never;
  return <div id="shot" style={{ maxWidth: 760, padding: 16 }}><CastView worldId="w" data={data} folders={[]} /></div>;
}
const wikiPages = [{ id: "p1", title: "Das Gutshaus Blackwood" }, { id: "p2", title: "Schattenbibliothek" }, { id: "p3", title: "Die Kapelle von Schattenmoor" }, { id: "p4", title: "Der Orden der Nachtwächter" }, { id: "p5", title: "Das Geschrei" }];
function Editor() {
  const html = "<h2>Die Schattenbibliothek</h2><p>Tief unter dem Gutshaus Blackwood liegt ein Archiv, dessen Regale länger sind, als der Raum es erlaubt. Hier lagert alles, was Schattenmoor vergessen wollte. Wer die Stufen hinabsteigt, hört oft das Geschrei, wenn der Nebel dicht wird.</p>";
  return (
    <div id="shot" style={{ maxWidth: 760, padding: 16, minHeight: 360 }}>
      <RichTextEditor name="content" initialContent={html} wikiPages={wikiPages} wikiCharacters={all.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatar_url }))} allowBlocks minHeight={200} />
    </div>
  );
}

const screens: Record<string, () => React.JSX.Element> = { szene: Scene, szene2: Scene2, wurfzeilen: RollRows, jn: YesNoRows, chabo: ChaboScreen, netz: Net, wuerfeln: Composer, schreiben: Composer, karte: MapScreen, tickets: TicketsList, ticket: TicketThread, besetzung: Besetzung, editor: Editor };
const Screen = screens[screen] ?? Scene;
createRoot(document.getElementById("root")!).render(<Screen />);
