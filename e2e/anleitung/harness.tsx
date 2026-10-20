// Bildschirmfotos für die Anleitung: echte Oberflächen mit erfundenen Beispieldaten (?screen=szene|chabo|netz|wuerfeln|karte).
import { createRoot } from "react-dom/client";
import { Chabo } from "@/components/chabo/chabo";
import { applyRace, emptySheet } from "@/lib/sheet-rules";
import { RelationshipGraph } from "@/app/characters/relationships/relationship-graph";
import { StoryEntryItem } from "@/app/story/[id]/story-entry-item";
import { StoryComposer } from "@/app/story/[id]/story-composer";
import { CustomEmojiProvider } from "@/components/custom-emoji-provider";
import { MapViewer } from "@/app/wiki/karten/[id]/map-viewer";
import type { Character, CharacterRelationship, StoryEntry } from "@/lib/types";

const params = new URLSearchParams(location.search);
const screen = params.get("screen") ?? "szene";
const pad = params.get("schmal") ? 8 : 16;

const avatar = (bg: string, letter: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='${bg}'/><text x='48' y='64' font-size='52' text-anchor='middle' fill='white' font-family='Georgia'>${letter}</text></svg>`);
const mk = (id: string, name: string, bg: string, house: string | null = null) =>
  ({ id, owner_id: "u1", world_id: "w", name, avatar_url: avatar(bg, name[0]), bio: null, sheet_url: null, house }) as unknown as Character;
const lyra = mk("lyra", "Lyra Nachtfeder", "#7a5a8c", "Haus Nachtfeder");
const ben = mk("ben", "Ben Rabenstein", "#4f6f8f", "Haus Rabenstein");
const mira = mk("mira", "Mira Salzwind", "#8f5f4f", "Haus Rabenstein");
const tom = mk("tom", "Kapitän Tom Eisenhart", "#5f8f6f");
const ivo = mk("ivo", "Ivo Dämmerlicht", "#8f8a4f", "Haus Nachtfeder");
const all = [lyra, ben, mira, tom, ivo];

function entry(id: string, c: Character, html: string, min: number, extra: Partial<StoryEntry> = {}): StoryEntry {
  return { id, story_post_id: "s1", character_id: c.id, content: html, created_at: new Date(Date.now() - min * 60000).toISOString(), characters: c, kind: "entry", ...extra } as StoryEntry;
}

function Scene() {
  const entries: StoryEntry[] = [
    entry("e1", ben, "<p>Der Nebel hing so dicht über dem Hafen, dass man die Laternen nur noch als matte Flecken erahnte. Ben zog den Kragen hoch und trat auf die Planken. <em>„Wer legt bei so einem Wetter noch ab?“</em></p>", 95),
    entry("e2", lyra, "<p>Lyra lehnte am Mast der <strong>Nachtschwalbe</strong> und lächelte schmal. „Jemand, der nicht gesehen werden will.“ Sie reichte ihm eine Laterne. „Kommst du mit, oder willst du weiter Fragen stellen?“</p>", 70),
    entry("e3", ben, "<p>Ben zögerte. Dann stieg er an Bord. Die Planken knarrten unter seinem Gewicht. Hinter ihnen verschwand der Hafen im Grau.</p>", 55),
    entry("e4", lyra, "", 40, { roll_label: "Lyra späht in den Nebel", roll_stat_name: "Wahrnehmung", roll_value: 12, roll_bonus: 0, roll_die: 8, roll_result: 8, roll_success: true, roll_luck_remaining: 3 } as Partial<StoryEntry>),
    entry("e5", mira, "<p>„Da vorn!“ Mira deutete auf einen Schatten backbord. Ein Mast, schief, halb versunken. „Das ist die <u>Seeschlange</u>. Die gilt seit zwanzig Jahren als verschollen.“</p>", 20),
  ];
  return (
    <div style={{ maxWidth: 720, padding: pad }} className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h1 className="font-serif text-2xl text-fg">Nebel über dem Hafen</h1>
        <p className="text-sm text-muted">Nebelhafen · Kapitel 1</p>
      </div>
      {entries.map((e) => (
        <StoryEntryItem key={e.id} entry={e} storyPostId="s1" canManage={false} mentionCharacters={all} displayHtml={e.content} ownCharacters={[lyra]} />
      ))}
    </div>
  );
}

function ChaboScreen() {
  let s = emptySheet();
  s.attrBasis = { MU: "13", IG: "12", GE: "10", KO: "9", IN: "14", KK: "7", FF: "8", CH: "12", SB: "9", GL: "10" };
  s.talentBonus = { talent_klettern: "5", talent_singen: "7", talent_heilen: "4" };
  const fill: Record<string, string> = { Vorname: "Lyra", Nachname: "Nachtfeder", Alter: "27", Rang: "Kapitänin" };
  s.personalFields = s.personalFields.map((f) => (fill[f.label] ? { ...f, value: fill[f.label] } : f));
  s = applyRace(s, "vampir");
  return (
    <div style={{ maxWidth: 1000, padding: pad }}>
      <Chabo characterId="c1" characterName="Lyra Nachtfeder" initial={s} editable={false} />
    </div>
  );
}

function Net() {
  const rel = (i: number, a: Character, b: Character, type: string, color: string, category: string) =>
    ({ id: `r${i}`, world_id: "w", character_a_id: a.id, character_b_id: b.id, type, color, label: null, category, family_role: null, created_by: "u", created_at: new Date().toISOString() }) as CharacterRelationship;
  const rels = [
    rel(1, lyra, ben, "Verbündet", "#5b9d6f", "freundschaft"),
    rel(2, lyra, mira, "Beste Freundin", "#5b9d6f", "freundschaft"),
    rel(3, ben, mira, "Geschwister", "#c0883f", "familie"),
    rel(4, lyra, tom, "Rivalen", "#c0564f", "rivale"),
    rel(5, tom, ivo, "Verliebt", "#c05a8a", "liebe"),
    rel(6, ivo, lyra, "Mentor", "#5b7fb0", "sonstiges"),
  ];
  return (
    <div style={{ maxWidth: 900, padding: pad }}>
      <RelationshipGraph characters={all} relationships={rels} history={[]} initialFocusId={null} />
    </div>
  );
}

function Dice() {
  return (
    <div style={{ maxWidth: 560, padding: pad }}>
      <StoryComposer storyPostId="s1" worldId="w" ownCharacters={[lyra, ben]} activeCharacterId="lyra" characters={all} participantIds={["lyra", "ben"]} calendar={{ months: [], weekdays: [] } as never} locations={[]} sceneLocation={null} userId="u1" worldMembers={[]} />
    </div>
  );
}

function MapScreen() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe3ea"/><stop offset="1" stop-color="#9fc0cc"/></linearGradient></defs><rect width="900" height="560" fill="url(#g)"/><path d="M180 140 Q300 60 460 120 T740 200 Q800 330 650 430 T330 470 Q150 430 180 140Z" fill="#a9c58c" stroke="#7c9a62" stroke-width="4"/><path d="M420 200 Q480 260 450 340" stroke="#7c9a62" stroke-width="3" fill="none"/></svg>`;
  const map = { id: "m1", world_id: "w", title: "Karte der Nebelküste", description: null, image_url: "data:image/svg+xml;utf8," + encodeURIComponent(svg), created_by: "u", created_at: "", updated_at: "" };
  const pins = [
    { id: "p1", map_id: "m1", x: 30, y: 36, label: "Nebelhafen", icon: "⚓", page_id: "pg1", target_map_id: null },
    { id: "p2", map_id: "m1", x: 62, y: 44, label: "Alte Burg", icon: "🏰", page_id: "pg2", target_map_id: null },
    { id: "p3", map_id: "m1", x: 50, y: 74, label: "Schwarzer Wald", icon: "🌲", page_id: null, target_map_id: null },
  ];
  return (
    <CustomEmojiProvider map={{}}>
      <div style={{ maxWidth: 900, padding: pad }}>
        <MapViewer map={map as never} initialPins={pins as never} pages={[{ id: "pg1", title: "Nebelhafen" }, { id: "pg2", title: "Alte Burg" }]} otherMaps={[]} />
      </div>
    </CustomEmojiProvider>
  );
}

const screens: Record<string, () => React.JSX.Element> = { szene: Scene, chabo: ChaboScreen, netz: Net, wuerfeln: Dice, karte: MapScreen };
const Screen = screens[screen] ?? Scene;
createRoot(document.getElementById("root")!).render(<Screen />);
