import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { TourButtons } from "@/components/tour-buttons";
import { ChevronLeft, CircleHelp } from "lucide-react";
import { ATTR_TABLE, TALENT_LIST } from "@/lib/charakterbogen-stats";
import { DICE_CONDITIONS } from "@/lib/dice-conditions";
import { BASIS_BUDGET, BASIS_MAX, BASIS_MIN, TALENT_ATTRS, TALENT_BONUS_BUDGET, TALENT_BONUS_MAX, TALENT_BONUS_MIN } from "@/lib/sheet-rules";

export const metadata = { title: "Hilfe" };

// Was jedes Attribut bedeutet und wofür man es würfelt.
const ATTR_INFO: Record<string, { desc: string; detail: string }> = {
  MU: { desc: "Willenskraft und Entschlossenheit", detail: "Mutprobe gegen Angst oder Einschüchterung, Durchhalten, etwas riskieren" },
  IG: { desc: "Geistige Kapazität, logisches Denken und Wissen", detail: "Rätsel lösen, Hinweise finden, Muster erkennen" },
  GE: { desc: "Beweglichkeit", detail: "Ausweichen, Akrobatik, Beweglichkeit in gefährlichen Umgebungen" },
  KO: { desc: "Körperliche Ausdauer und Widerstandsfähigkeit", detail: "Krankheiten widerstehen, bei Erschöpfung durchhalten" },
  IN: { desc: "Situationen erfassen, ohne bewusst nachzudenken", detail: "Gefahren wahrnehmen, Personen einschätzen" },
  KK: { desc: "Physische Stärke und Muskelkraft", detail: "Schwere Gegenstände heben oder tragen, Nahkampfangriffe" },
  FF: { desc: "Geschicklichkeit und Feinmotorik", detail: "Diebstahl, Schlösser knacken, Geräte bedienen, Reparaturen" },
  CH: { desc: "Ausstrahlung und Überzeugungskraft", detail: "Überzeugen, Lügen, Gruppen anführen, Auftreten, Wirkung auf andere" },
  SB: { desc: "Emotionale und geistige Widerstandsfähigkeit", detail: "Starken Reizen widerstehen" },
  GL: { desc: "Schicksal und Fügungen", detail: "Alles, was Glück erfordert" },
};

const TOC = [
  ["wuerfeln", "Wie funktioniert das Würfeln?"],
  ["verlauf", "Würfelverlauf"],
  ["attribute", "Attribute: Basiswert, Bonus, Gesamtwert"],
  ["attribute-erklaert", "Was bedeuten die Attribute?"],
  ["talente", "Talente: Wie wird der Wert berechnet?"],
  ["talentpunkte", "Talentpunkte selbst verteilen"],
  ["glueck", "Glückspunkte: Nochmal würfeln bei Pech"],
  ["natur", "Besondere Naturen"],
  ["bogen", "ChaBo (Steckbrief) bearbeiten und speichern"],
  ["zufall", "Zufall und NPCs"],
  ["uebersicht", "Welches Talent braucht welche Attribute?"],
  ["kuerzel", "Tastenkürzel und Schreibhilfen"],
  ["momente", "Wichtige Momente"],
  ["mehrere-figuren", "Mehrere Figuren in einer Nachricht"],
  ["welten", "Welten entdecken, Übungswelt und Rechte"],
  ["verlassen", "Welt verlassen, Besitz übertragen, Konto löschen"],
  ["benachrichtigungen", "Benachrichtigungen aus mehreren Welten"],
  ["passwort-vergessen", "Passwort vergessen"],
] as const;

// Tastenkürzel: links Windows/Linux, rechts Mac
const SHORTCUTS: { keys: [string, string]; what: string }[] = [
  { keys: ["Strg + K", "⌘ K"], what: "Charakter suchen und wechseln (beim Schreiben in der Story)" },
  { keys: ["Alt + 0", "⌥ 0"], what: "Zurück zum Charakter, mit dem du davor geschrieben hast" },
  { keys: ["Alt + ,", "⌥ ,"], what: "Vorheriger Charakter" },
  { keys: ["Alt + .", "⌥ ."], what: "Nächster Charakter" },
  { keys: ["Strg + Alt + ↑ / ↓", "⌃ ⌥ ↑ / ↓  oder  ⌘ ⌥ ↑ / ↓"], what: "Vorheriger / nächster Charakter (zusätzliche Variante)" },
];

const h2 = "font-serif text-2xl text-fg";
const p = "text-fg-soft";
const example = "rounded-xl bg-surface-2 px-4 py-3 text-sm text-fg-soft";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3">
      <h2 className={h2}>{title}</h2>
      {children}
    </section>
  );
}

export default async function HelpPage() {
  // Ohne Würfeln in der aktiven Welt gibt es keinen Würfelverlauf
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const world = user ? await getActiveWorld(user.id) : null;
  const showRolls = world?.dice_enabled !== false;
  const nameByCode = new Map<string, string>(ATTR_TABLE.map((a) => [a.code, a.name]));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8 xl:max-w-3xl">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href="/story" aria-label="Zurück" className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <CircleHelp className="h-6 w-6 text-accent" strokeWidth={1.75} />
          <h1 className="font-serif text-3xl text-fg">Hilfe: Wie funktioniert das System?</h1>
        </div>
        <nav aria-label="Inhaltsverzeichnis" className="rounded-2xl border border-line bg-surface p-4">
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {TOC.map(([id, label], i) => (showRolls || id !== "verlauf") && (
              <li key={id}>
                <a href={`#${id}`} className="flex gap-2 rounded-lg px-2 py-1 text-fg-soft transition hover:bg-surface-2 hover:text-accent">
                  <span className="text-muted">{i + 1}.</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <TourButtons />
      </header>

      <Section id="wuerfeln" title="1. Wie funktioniert das Würfeln?">
        <p className={p}>
          Gewürfelt wird in der Story: Öffne eine Szene, wähle unter dem Textfeld den Reiter <strong>Würfeln</strong>, nimm einen Wert aus deinem ChaBo (ein Attribut oder ein Talent) und würfle. Es gibt den W4, W6, W8,
          W10, W12, W20 und W100.
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            <strong>Mit Wert:</strong> Ist der Wurf <strong>kleiner oder gleich</strong> dem Wert, ist es ein Erfolg. Ist er größer, ist es ein Misserfolg. Als Wert nimmst du meist den Gesamtwert eines Attributs oder
            Talents. Er wird dir beim Auswählen schon eingetragen.
          </li>
          <li>
            <strong>Bonus:</strong> Ein positiver Bonus erleichtert die Probe, ein negativer erschwert sie. Er wird auf den Wert gerechnet, nicht auf den Wurf.
          </li>
          <li>
            <strong>Zustand:</strong> Bei einer Probe mit Wert kannst du einen Zustand wählen, der den Wurf erschwert. Es gibt{" "}
            {DICE_CONDITIONS.map((c) => (
              <span key={c.id}>
                „{c.label}“ in den Stufen {c.levels.map((l) => `${l.label.toLowerCase()} (${l.malus})`).join(", ")}
              </span>
            ))}
            . Die Stufe zieht ihren Wert vom Wert ab, zusätzlich zu einem eigenen Bonus. Im Eintrag des Wurfs steht der Zustand dabei.
          </li>
          <li>
            <strong>Ohne Wert:</strong> Es wird einfach nur gewürfelt, ohne Erfolg oder Misserfolg.
          </li>
          <li>
            <strong>Gegen wen?</strong> Würfelst du auf eine andere Figur, bekommt sie eine Benachrichtigung und der Wurf steht mit ihrem Namen in der Szene.
          </li>
        </ul>
        <div className={example}>
          <strong>Beispiel:</strong> Dein Talent „Klettern“ hat den Gesamtwert 13, du würfelst einen W20 und bekommst 9. 9 ist kleiner als 13, also ein Erfolg. Bei einer 15 wäre es ein Misserfolg. Mit einem Malus von −3
          würde die Probe nur noch gegen 10 laufen.
        </div>
        <p className={p}>
          Das Ergebnis steht als Eintrag in der Szene, grün bei Erfolg und rot bei Misserfolg. Jeder Wurf kommt außerdem in den Würfelverlauf.
        </p>
      </Section>

      {showRolls && (
      <Section id="verlauf" title="2. Würfelverlauf">
        <p className={p}>
          Alle Würfe deiner aktuellen Welt stehen im <strong>Würfelverlauf</strong>, neueste zuerst. Du findest ihn links in der Seitenleiste unter „Würfelverlauf“ (am Handy im Menü „Mehr“). Mit den Filtern zeigst du nur einen Charakter oder nur
          Erfolge beziehungsweise Misserfolge. Ein Klick auf einen Wurf führt direkt zu seiner Zeile in der Szene und hebt sie kurz hervor. Mit dem Papierkorb löschst du eigene Würfe. Ein gelöschter Wurf verschwindet auch aus der Szene. Würfe aus privaten Szenen siehst du nur, wenn du die Szene auch sonst sehen darfst.
        </p>
      </Section>
      )}

      <Section id="attribute" title="3. Attribute: Basiswert, Bonus, Gesamtwert">
        <p className={p}>Dein Charakter hat 10 Attribute. Jedes hat drei Werte:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            <strong>Basiswert:</strong> Eine Zahl von {BASIS_MIN} bis {BASIS_MAX}, die du selbst vergibst. Insgesamt hast du {BASIS_BUDGET} Punkte, die du frei auf alle 10 Attribute verteilst.
          </li>
          <li>
            <strong>Bonus:</strong> Normalerweise leer. Ist dein Charakter ein Werwolf oder Vampir, tragen sich hier feste Boni ein. Du kannst den Bonus auch selbst setzen, er darf zwischen −19 und 19 liegen.
          </li>
          <li>
            <strong>Gesamtwert:</strong> Basiswert plus Bonus. Dieser Wert zählt beim Würfeln.
          </li>
        </ul>
        <p className={p}>
          <strong>Ausnahme Glück (GL):</strong> Glück hat nur einen Basiswert, keinen Bonus und keinen Gesamtwert. Aus dem Basiswert ergeben sich die Glückspunkte (siehe Abschnitt 7).
        </p>
      </Section>

      <Section id="attribute-erklaert" title="4. Was bedeuten die Attribute?">
        <ul className="flex flex-col gap-2">
          {ATTR_TABLE.map((a) => (
            <li key={a.code} className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-fg">
                <span className="mr-2 text-xs font-semibold text-muted">{a.code}</span>
                <span className="font-medium">{a.name}</span>
              </p>
              <p className="text-sm text-fg-soft">{ATTR_INFO[a.code].desc}</p>
              <p className="text-sm text-muted">Zum Beispiel: {ATTR_INFO[a.code].detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="talente" title="5. Talente: Wie wird der Wert berechnet?">
        <p className={p}>Talente sind Fähigkeiten wie „Lügen“ oder „Klettern“. Jedes Talent baut auf genau zwei deiner Attribute auf.</p>
        <p className={p}>
          Der <strong>Basiswert eines Talents wird automatisch berechnet</strong>: Die Gesamtwerte der zwei zugehörigen Attribute werden addiert, durch 2 geteilt und kaufmännisch gerundet (0,5 wird aufgerundet).
        </p>
        <div className={example}>
          <strong>Beispiel:</strong> „Klettern“ braucht Gewandtheit und Körperkraft. Ist Gewandtheit 14 und Körperkraft 12, ergibt (14 + 12) ÷ 2 = 13 den Basiswert 13.
        </div>
        <p className={p}>
          Ändert sich später eines der beiden Attribute, zum Beispiel durch einen Bonus, rechnet sich der Talentwert von selbst neu. Wer in der Ansicht des ChaBo ein Talent anfasst, sieht, aus welchen Attributen es sich zusammensetzt.
        </p>
      </Section>

      <Section id="talentpunkte" title="6. Talentpunkte selbst verteilen">
        <p className={p}>
          Zusätzlich zum automatischen Basiswert hast du <strong>{TALENT_BONUS_BUDGET} Talentpunkte</strong>, die du als Bonus auf die Talente verteilst.
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            Jeder Talent-Bonus liegt zwischen <strong>{TALENT_BONUS_MIN} und {TALENT_BONUS_MAX}</strong>. Ein negativer Bonus senkt das Talent, gibt dir aber Punkte für andere Talente frei.
          </li>
          <li>
            Insgesamt dürfen nie mehr als {TALENT_BONUS_BUDGET} Punkte verteilt sein. Oben im Bogen siehst du, wie viele noch frei sind. Bei zu vielen Punkten färbt sich die Anzeige rot, und der Bogen wird nicht gespeichert, bis es
            wieder passt.
          </li>
          <li>
            Gesamtwert des Talents = Basiswert plus Bonus, höchstens {TALENT_BONUS_MAX}. Geht die Summe darüber, wird sie bei {TALENT_BONUS_MAX} gedeckelt, und der Bonus wirkt nicht voll.
          </li>
        </ul>
      </Section>

      <Section id="glueck" title="7. Glückspunkte: Nochmal würfeln bei Pech">
        <p className={p}>Glück ist eine aktive Fähigkeit. Aus dem Glück-Basiswert ergeben sich Glückspunkte, nach dieser Tabelle:</p>
        <div className={example}>
          Basiswert 1–4: 1 Glückspunkt
          <br />
          Basiswert 5–9: 2 Glückspunkte
          <br />
          Basiswert 10–14: 3 Glückspunkte
          <br />
          Basiswert 15–19: 4 Glückspunkte
        </div>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            Die Glückspunkte gelten <strong>pro Szene</strong>. In jeder Szene fängst du mit allen Punkten neu an.
          </li>
          <li>Hast du bei einer Probe mit Wert danebengewürfelt, fragt dich das Würfeln „Glückspunkt nutzen?“, solange du noch einen hast. Mit „Ja, nochmal würfeln“ wird genau dieser Wurf wiederholt, mit „Nein“ bleibt es beim Misserfolg.</li>
          <li>Das geht nur nach einem Misserfolg und nur bei Proben mit Wert, nicht bei freien Würfen.</li>
          <li>Die übrigen Glückspunkte siehst du beim Würfeln als Kleeblätter. Sie stehen auch im Eintrag des Wurfs.</li>
        </ul>
      </Section>

      <Section id="natur" title="8. Besondere Naturen">
        <p className={p}>
          Wenn in der Welt gewürfelt wird, kannst du im ChaBo unter „Besondere Natur“ eine Natur wählen, standardmäßig Werwolf oder Vampir. Dann tragen sich feste Boni bei den Attributen ein. Wechselst du zurück auf „Keine“, verschwinden sie wieder. Admins legen unter „Bearbeiten“ → „Besondere Naturen“ eigene Naturen mit eigenen Boni an, so viele sie wollen. Ohne Würfeln gibt es keine besondere Natur.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-soft">
            <p className="font-medium text-fg">Werwolf</p>
            Mut +3, Gewandtheit +5, Konstitution +5, Körperkraft +5, Charisma +1, Selbstbeherrschung −5
          </li>
          <li className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-soft">
            <p className="font-medium text-fg">Vampir</p>
            Gewandtheit +5, Konstitution +5, Intuition +3, Körperkraft +3, Charisma +5, Selbstbeherrschung −5
          </li>
        </ul>
      </Section>

      <Section id="bogen" title="9. ChaBo (Steckbrief) bearbeiten und speichern">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            <strong>ChaBo oder Steckbrief:</strong> Es ist dasselbe Blatt deines Charakters. In Welten, in denen gewürfelt wird, heißt es <strong>ChaBo</strong> (Charakterbogen) und hat zusätzlich Attribute, Talente und die besondere Natur. In Welten ohne Würfeln heißt es <strong>Steckbrief</strong> und zeigt Bild, persönliche Angaben mit allen eigenen Feldern, die du hinzufügst, Familie und Notizen, nur ohne Attribute, Talente und Natur. Wo in dieser Hilfe „ChaBo“ steht, ist in solchen Welten der Steckbrief gemeint.
          </li>
          <li>Du findest ihn in der Seitenleiste unter „ChaBo“ bzw. „Steckbrief“, im Profil eines Charakters als Reiter und in jeder Szene über das Bogen-Symbol neben „Würfeln“.</li>
          <li>Bearbeiten kann nur, wem der Charakter gehört. Alle anderen in der Welt können ihn ansehen.</li>
          <li>Änderungen werden automatisch gespeichert, sobald alle Werte gültig sind. Ungültige Felder sind rot markiert, solange wird nicht gespeichert.</li>
          <li>Das Bild im ChaBo ist unabhängig vom Profilbild des Charakters.</li>
          <li>
            Mit dem <strong>Schloss</strong> („Geheim halten“) neben einer Zeile (persönliche Infos, Familie) oder einem Notiz-Block machst du sie <strong>geheim</strong>. Geheimes sieht nur du, niemand sonst in der Welt, auch nicht in der Ansicht oder im Verlauf.
          </li>
          <li>
            Wer wann was am ChaBo geändert hat, steht in der Redaktion unter <strong>Verlauf</strong>, zum Beispiel „Hörnchen hat Mut bearbeitet 13 → 11“ und darunter der Name des Charakters.
          </li>
          <li>Die Notizen sind frei formatierbar. Du kannst beliebig viele Blöcke mit eigenen Überschriften anlegen.</li>
          <li>
            In der Sektion <strong>Beziehungen</strong> legst du eigene Zeilen an, zum Beispiel „Mutter“ oder „Beste Freundin“. Die Bezeichnung tippst du frei oder wählst einen Vorschlag. Auch die Überschrift lässt sich beim Bearbeiten ändern, zum Beispiel in „Familie“ oder „Freunde“.
          </li>
          <li>
            In den persönlichen Infos, in der Familie und in den Notizen kannst du mit <strong>@</strong> Charaktere deiner Welt markieren. Tippe @ und wähle den Namen aus der Liste. In der Ansicht steht nur der Name (ohne @) und ist ein Link zum Profil.
          </li>
          <li>Ist bei einem Charakter noch ein Link zu einem alten Charakterbogen gespeichert, übernimmst du ihn beim Bearbeiten mit „Aus altem Charakterbogen übernehmen“. Neue Links lassen sich nicht mehr eintragen.</li>
        </ul>
      </Section>

      <Section id="zufall" title="10. Zufall und NPCs">
        <h3 className="font-medium text-fg">Würfeln im ChaBo</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            Beim Bearbeiten steht neben vielen Angaben ein <strong>Würfel</strong>: Vorname, Nachname, Spitzname, Geschlecht, Alter, Wesen, Hobbys, Beruf / Schule / AG, Eigenheiten, Lebensziel / Wunsch, Geheimnis und Größte Angst. Ein Klick würfelt nur diese Zeile neu.
          </li>
          <li>
            <strong>Alles zufällig</strong> füllt alle leeren Angaben auf einmal und legt fehlende Zeilen an. Was du schon eingetragen hast, bleibt. Mit <strong>Rückgängig</strong> holst du den Stand davor zurück.
          </li>
          <li>Die gewürfelten Namen sind englisch, amerikanisch oder irisch. Der Vorname passt zum gewürfelten Geschlecht und ist in deiner Welt noch nicht vergeben.</li>
          <li>Das Alter richtet sich nach dem Wesen: Vampire sind deutlich älter als Menschen und Werwölfe. Beruf oder Schule passen zum Alter.</li>
          <li>
            <strong>Attribute</strong> und <strong>Talente</strong> haben einen eigenen Würfel. Bei den Attributen wählst du „Ausgewogen“ oder „Wild“, bei den Talenten „Spezialist:in“ oder „Allrounder:in“. Es werden immer genau die {BASIS_BUDGET} Attribut- und {TALENT_BONUS_BUDGET} Talentpunkte verteilt, und alle Grenzen aus den Abschnitten 3 bis 6 gelten weiter. Jeder Wurf hat sein eigenes Rückgängig.
          </li>
        </ul>

        <h3 className="mt-2 font-medium text-fg">Eigene Listen deiner Welt</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            Unter <strong>Einstellungen → Zufallslisten</strong> ergänzt du eigene Vornamen, Nachnamen, Spitznamen, Hobbys, Berufe, Eigenheiten, Lebensziele, Geheimnisse und Ängste. Du kannst viele auf einmal einfügen, <strong>eine Zeile pro Eintrag</strong>.
          </li>
          <li>Die Listen gehören zur Welt. Alle Mitglieder sehen und nutzen sie. Löschen darf, wer einen Eintrag angelegt hat, und die Besitzerin der Welt.</li>
          <li>Der Würfel mischt deine Einträge unter die mitgelieferten. Je mehr du einträgst, desto öfter kommen sie vor.</li>
        </ul>

        <h3 className="mt-2 font-medium text-fg">Wiki-Startseite</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Besitzer:in und Admins einer Welt richten im Wiki über <strong>Startseite einrichten</strong> (bzw. <strong>Startseite anpassen</strong>) eine eigene Startseite ein. Sie erscheint, sobald jemand „Wiki“ öffnet.</li>
          <li>Bausteine sind Titelbild, Text, Kacheln (Artikel, Ordner, Karten), Listen (zuletzt bearbeitet, neu, Favoriten, Entwürfe, Szenen, Tags), Suche und Schnellzugriffe. Du kannst sie verschieben, ausblenden und löschen.</li>
          <li>Die automatische Übersicht bleibt über <strong>Übersicht</strong> erreichbar. Wird die Startseite entfernt, erscheint sie wieder als Wiki-Einstieg.</li>
        </ul>

        <h3 className="mt-2 font-medium text-fg">NPCs</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Ein <strong>NPC</strong> ist ein Charakter ohne Spieler:in dahinter, zum Beispiel eine Lehrerin oder ein Händler. Du legst ihn wie einen Charakter an und schaltest dabei „NPC“ ein. Unter „Charaktere“ gibt es den Reiter <strong>NPCs</strong>.</li>
          <li>Mit <strong>Komplett würfeln</strong> entsteht ein fertiger NPC mit Name, Wesen, Kurzbeschreibung, allen Angaben und einem gültigen ChaBo.</li>
          <li>NPCs schreiben nur in <strong>Story-Szenen</strong>. Sie posten nicht im Feed, folgen niemandem und tauchen nicht in Chats und Suche auf. Im Wiki, bei @-Erwähnungen und im Beziehungsnetz kommen sie dagegen vor.</li>
          <li>Bearbeiten dürfen den NPC die Person, die ihn angelegt hat, und die Besitzerin der Welt. Zwischen NPC und normalem Charakter umschalten darf nur, wer ihn angelegt hat.</li>
          <li>Im ChaBo wechselst du oben zwischen deinen Charakteren und den NPCs, ohne den aktiven Charakter zu ändern.</li>
        </ul>
      </Section>

      <Section id="uebersicht" title="11. Welches Talent braucht welche Attribute?">
        <p className={p}>
          Das ist die Standardliste. Besitzer:innen und Admins einer Welt können sie unter „Welt bearbeiten“ → „Talente“ ändern: Talente umbenennen, entfernen, hinzufügen und festlegen, aus welchen zwei Attributen sie sich zusammensetzen. Entfernte Talente verlieren in den Bögen ihre verteilten Punkte.
        </p>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-2 border-b border-line bg-surface-2 px-4 py-2 text-xs font-medium text-muted">
            <span>Talent</span>
            <span>Setzt sich zusammen aus</span>
          </div>
          <ul className="divide-y divide-line">
            {TALENT_LIST.map((name) => (
              <li key={name} className="grid grid-cols-2 gap-2 px-4 py-2 text-sm">
                <span className="text-fg [overflow-wrap:anywhere]">{name}</span>
                <span className="text-fg-soft [overflow-wrap:anywhere]">{TALENT_ATTRS[name].map((c) => nameByCode.get(c)).join(" + ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="kuerzel" title="12. Tastenkürzel und Schreibhilfen">
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Windows / Linux</th>
                <th className="px-3 py-2 font-medium">Mac</th>
                <th className="px-3 py-2 font-medium">Wirkung</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.what} className="border-t border-line align-top">
                  <td className="px-3 py-2">
                    <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-xs text-fg">{s.keys[0]}</kbd>
                  </td>
                  <td className="px-3 py-2">
                    <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-xs text-fg">{s.keys[1]}</kbd>
                  </td>
                  <td className="px-3 py-2 text-fg-soft">{s.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={p}>Im Menü „Du schreibst als“ stehen die zuletzt benutzten Charaktere oben, und es gibt dort eine Suche.</p>

        <h3 className="mt-2 font-medium text-fg">Schreibhilfen</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>
            <strong>@Name</strong> erwähnt einen Charakter. Der Name im Text ist anklickbar und führt zum Profil (Strg bzw. ⌘ halten öffnet einen neuen Tab). In Gruppen und im Welt-Chat der Redaktion erwähnst du mit <strong>@Benutzername</strong> ein Konto, das auch bei stummem Chat eine Meldung bekommt.
          </li>
          <li>
            <strong>Spoiler im Text:</strong> Text markieren und auf das durchgestrichene Auge klicken. Er bleibt verwischt, bis jemand ihn anklickt. Im Chat setzt du zwei senkrechte Striche um den Text: <code className="rounded bg-surface-2 px-1">||Text||</code>.
          </li>
          <li>
            <strong>Ganze Szene oder Nachricht als Spoiler:</strong> Schild-Symbol in den Werkzeugen der Szene bzw. an der Nachricht.
          </li>
          <li>
            <strong>Chat nur für eine Szene:</strong> Reiter „Chat“ neben Schreiben und Würfeln. Dort sprecht ihr als Spielende miteinander, nicht als Charaktere.
          </li>
        </ul>
      </Section>

      <Section id="momente" title="13. Wichtige Momente">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Auswählen:</strong> In einer Szene am Handy die Nachricht einmal antippen, dann das Lesezeichen. Am Computer erscheint das Lesezeichen beim Darüberfahren. Danach tippst du die letzte Nachricht an, alles dazwischen wird mit ausgewählt. Das Lesezeichen der ersten Nachricht oder „Abbrechen“ beendet die Auswahl.
          </li>
          <li>
            <strong>Speichern:</strong> Gib einen Titel und eine Notiz an, wähle einen oder mehrere deiner Charaktere und eine Sammlung (eine vorhandene oder ein neuer Name wie Erinnerungen, Geschehnisse oder Unfälle). Der Wortlaut wird als Kopie mitgespeichert und bleibt lesbar, auch wenn die Nachrichten später geändert oder gelöscht werden. Nur du siehst deine Ausschnitte.
          </li>
          <li>
            <strong>Im ChaBo:</strong> Unter „Wichtige Momente“ liegen deine Sammlungen. Du kannst sie anlegen, umbenennen und löschen, Ausschnitte lesen, Titel und Notiz ändern, aus einer Sammlung entfernen oder ganz löschen. Die Symbole erscheinen oben rechts, wenn du mit der Maus darüberfährst oder den Eintrag antippst. Ein Ausschnitt, der in keiner Sammlung mehr liegt, wird gelöscht. „Zur Szene“ springt zurück und hebt die Nachrichten hervor.
          </li>
          <li>
            <strong>Im Wiki für alle:</strong> Beim Speichern „Im Wiki für alle zeigen“ wählen oder später im ChaBo das Wiki-Symbol am Ausschnitt antippen. Es entsteht eine Wiki-Seite der Art „Wichtiger Moment“ mit dem Wortlaut, die alle in der Welt sehen. Das ist eine feste Kopie: Dein privater Ausschnitt bleibt unverändert, spätere Änderungen daran erscheinen nicht im Wiki. Aus geheimen Szenen geht das nicht.
          </li>
          <li>
            <strong>Als Text oder PDF:</strong> Jede Sammlung lässt sich als Textdatei laden oder über die Druckansicht als PDF speichern.
          </li>
          <li>
            <strong>Im Szenen-Chat zitieren:</strong> Nach der Auswahl das Zitat-Symbol antippen. Das Zitat landet im Chat-Eingabefeld, du kannst Text dazuschreiben oder es allein senden. Ein Klick auf das Zitat im Chat springt zu den Nachrichten in der Szene. Gespeicherte Ausschnitte kannst du im ChaBo mit „Im Chat der Szene teilen“ senden.
          </li>
        </ul>
      </Section>

      <Section id="mehrere-figuren" title="14. Mehrere Figuren in einer Nachricht (Bündeln)">
        <p className={p}>
          Hast du in einer Welt mindestens zwei Figuren, siehst du über dem Schreibfeld der Szene den Knopf <strong>Bündeln</strong>. Damit schreibst du mit mehreren deiner Figuren in <strong>einer</strong> Nachricht.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Je Abschnitt wählst du die Figur per Klick und schreibst ihren Text. Mit „Weitere Figur“ kommt ein neuer Abschnitt dazu (bis zu 8). Das Entfernen-Kreuz erscheint am Handy nach Antippen des Abschnitts, am Laptop beim Darüberfahren.</li>
          <li>Nach dem Senden sieht die Nachricht aus wie mehrere Nachrichten: jede Figur mit Profilbild, Namen und eigenem Text, durch eine Linie getrennt. Ein Klick auf Bild oder Namen öffnet den ChaBo.</li>
          <li>Oben an der Nachricht steht die erste Figur. Danach ist keine deiner eigenen Figuren als Nächstes dran.</li>
          <li>Das funktioniert nur mit deinen eigenen Figuren und nicht als Erzähler:in. Beim Bearbeiten bleiben die Abschnitte erhalten.</li>
        </ul>
      </Section>
      <Section id="welten" title="15. Welten entdecken, Übungswelt und Rechte">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Übungswelt:</strong> Schattenmoor ist als Übungswelt zum Ausprobieren da. Du kannst dort einen Charakter anlegen, in Szenen schreiben, würfeln und Wiki-Seiten bauen. Aufgeräumt wird bei Bedarf von Hand durch die Betreiberin. Die Figuren, Beispielszenen und Wiki-Seiten von Schattenmoor bleiben.
          </li>
          <li>
            <strong>Welten entdecken:</strong> Unter „Welten“ → „Welten entdecken“ siehst du die öffentlichen Welten mit Mitgliederzahl und letzter Aktivität. Steht dort „Erkunden“, kannst du Willkommenstext, Wiki, Figuren und manchmal auch Szenen ansehen, bevor du beitrittst. Was sichtbar ist, bestimmen die Admins der Welt. Eine Welt erscheint dort auch dann, wenn sie nicht „Öffentlich“ ist und nur auf Einladung beitritt, sobald sie „Erkunden“ erlaubt: Ansehen geht dann, beitreten nur mit Einladung.
          </li>
          <li>
            <strong>Beitritt:</strong> Je Welt gibt es drei Arten. Offene Welten betrittst du mit einem Klick. Bei „Auf Anfrage“ schickst du eine Nachricht an die Admins und wirst benachrichtigt, sobald sie entscheiden; über „Admin anschreiben“ erreichst du sie im privaten Chat. „Nur auf Einladung“ geht nur mit dem Einladungslink der Admins (er enthält einen Schlüssel) oder von Freund:innen. Ein alter Link ohne Schlüssel bietet „Beitritt anfragen“, die Admins entscheiden.
          </li>
          <li>
            <strong>Auswahllisten:</strong> Admins legen unter „Bearbeiten“ → „Auswahllisten“ Listen wie Wesen, Haus oder Beruf an und tragen die Einträge ein. Je Liste ist einstellbar, ob beim Anlegen und Bearbeiten eines Charakters ein Dropdown oder ein freies Textfeld erscheint. Die Liste „Wesen“ gibt es in jeder Welt: Hat sie Einträge, ersetzt sie die feste Auswahl Mensch / Vampir / Werwolf; heißt der gewählte Eintrag Vampir oder Werwolf, gelten dessen Würfelregeln weiter. Die gewählten Werte stehen im Profil. Bei jedem Eintrag kannst du unter „max“ eine <strong>Höchstzahl</strong> festlegen, zum Beispiel höchstens 2 Vampire in der Welt. Daneben steht, wie viele es schon gibt (z. B. „1/2“). Ist ein Eintrag voll, steht er im Charakterformular als „(voll)“ und lässt sich nicht mehr wählen; wer ihn schon hat, behält ihn. Leer lassen heißt unbegrenzt.
          </li>
          <li>
            <strong>Rechte in der Welt:</strong> Besitzer:in und ernannte Admins dürfen immer alles. Für alle anderen stellen die Admins unter „Welt bearbeiten“ ein, wer Wiki-Seiten anlegen oder bearbeiten, Ordner, Karten und Seitenarten ändern, Szenen starten und Handlungsstränge anlegen darf. Neue Welten starten streng: Mitglieder bearbeiten nur ihre eigenen Wiki-Seiten und ändern keine Ordner oder Karten.
          </li>
          <li>
            <strong>Geheime Felder:</strong> Admins können unter „Welt bearbeiten“ bei den Rechten „Geheime Felder erlauben“ ausschalten. Dann kann in dieser Welt niemand mehr Neues geheim halten, weder in Steckbrief und ChaBo noch bei Beziehungen. Was schon geheim ist, bleibt gespeichert und nur für die Besitzer:in des Charakters sichtbar; sie kann es offenlegen oder löschen.
          </li>
          <li>
            <strong>Admin-Meldungen:</strong> Besitzer:in und Admins bekommen eine Benachrichtigung, wenn jemand der Welt beitritt, einen Charakter oder NPC erstellt, die Welt verlässt oder einen Charakter löscht und wenn ein Eintrag seine Höchstzahl erreicht. Das ist standardmäßig an. Unter „Welt bearbeiten“ → „Meine Admin-Meldungen“ schaltest du einzelne Meldungen für dich und diese Welt aus; die anderen Admins behalten ihre Einstellung. Die ganze Gruppe lässt sich auch in den Benachrichtigungs-Einstellungen ausschalten.
          </li>
          <li>
            <strong>Übersicht der Welt:</strong> Admins sehen über „Übersicht“ auf der Weltseite die Zahlen ihrer Welt: Mitglieder und offene Anfragen, wie viele Charaktere es je Wesen oder Liste gibt (mit Höchstzahl), die Aktivität der letzten 7 Tage sowie Wiki-Seiten, Handlungsstränge und Beziehungen. Zu Geheimem zeigt sie nur eine Gesamtzahl, nie Inhalt oder Besitzer:in.
          </li>
          <li>
            <strong>Mitglieder und ihre Charaktere:</strong> Oben in der Übersicht steht die Mitgliederliste. Ein Klick auf ein Mitglied klappt alle seine Charaktere mit ihrem Wesen auf. „Nach Wesen“ gruppiert dieselben Figuren nach Wesen, die Suche findet Mitglieder, Charaktere und Wesen. NPCs und freie Rollen stehen in einer eigenen Gruppe.
          </li>
          <li>
            <strong>Frei oder beschäftigt, und wo:</strong> Auf dem Profil deines Charakters tippst du auf „Status setzen“, wählst „Frei“ oder „Beschäftigt“ (zum Beispiel in einer Szene) und trägst ein, wo der Charakter gerade ist. Alle in der Welt sehen das auf dem Profil und in der Charakterliste der Welt. Nochmal auf die Wahl tippen schaltet sie aus, „Löschen“ leert beides.
          </li>
          <li>
            <strong>Charaktere prüfen:</strong> Admins schalten unter „Welt bearbeiten“ → Regeln „Neue Charaktere prüfen“ ein. Neue Charaktere normaler Mitglieder stehen dann zuerst auf „Zur Prüfung“ (Charaktere von Admins und NPCs nicht). Auf der Seite „Prüfung“ eines Charakters genehmigen Admins oder lehnen mit Hinweis ab; wer abgelehnt wurde, ändert den Charakter und reicht ihn erneut ein. Zusätzlich können Admins zu jedem Feld (Profil, Auswahllisten, ChaBo mit Angaben, Attributen, Talenten und Notizen) eine Änderung vorschlagen. Die Besitzer:in sieht alt und neu nebeneinander und übernimmt oder lehnt ab. Geheimes bleibt dabei unsichtbar. Alle Charaktere „Zur Prüfung“ stehen in der Charakterliste der Welt unter dem Filter „Zur Prüfung“.
          </li>
          <li>
            <strong>Rollen zu vergeben:</strong> Beim Anlegen eines Charakters gibt es den Haken „Frei: noch ohne Spieler:in, zum Anbieten“. Ein freier Charakter ist kein NPC, der Haken „NPC“ bleibt unberührt. Er zählt nicht zu deinen spielbaren Charakteren, erscheint als „Frei“ in den Listen und lässt sich anbieten oder anfragen. Nachträglich geht es mit „Zu vergeben“ unter „Bearbeiten“, bei NPCs auch direkt in der NPC-Liste. Auch Hauptcharaktere lassen sich vergeben: Die Besitzer:in setzt unter „Bearbeiten“ den Haken „Zu vergeben“ oder bietet den Charakter einer Person an; er bleibt ein normaler Charakter und wechselt samt Geschichte das Konto. Über die Liste „Angelegt“ in „Charaktere“ siehst du alle von dir angelegten Charaktere mit Stand (frei, vergeben, eigen, NPC) und gibst sie dort frei oder bietest sie an; die Vergabe-Optionen klappen auf, wenn du den Pfeil rechts an der Karte antippst (in „Story → Charaktere“, „Angelegt“ und der NPC-Liste). Der Filter „Vergeben“ in „Story → Charaktere“ enthält auch deine eigenen Charaktere. Die Figur erscheint dann auf der Weltseite unter „Zu vergeben“. Mitglieder können sie dort anfragen, ein Admin entscheidet. Admins können eine Rolle auch einem Mitglied anbieten, das Angebot muss die Person annehmen. Bei der Übergabe wechselt der Charakter samt Beiträgen, Bogen, Geheimem und Verlauf auf das Konto der neuen Besitzer:in und ist dann ein normaler Charakter (kein NPC, nicht mehr frei). Wer einen Charakter nicht mehr spielen möchte, gibt ihn unter „Bearbeiten“ → „An die Welt zurückgeben“ zurück. Alle Admins der Welt dürfen NPCs und freie Charaktere bearbeiten.
          </li>
          <li>
            <strong>Ohne Charakter erkunden:</strong> Nach dem Beitritt musst du nicht gleich einen Charakter anlegen. Du kannst Feed, Story, Wiki, Figuren und die Weltseite ansehen. Zum Schreiben, Liken und Chatten brauchst du einen Charakter; ein Hinweis mit „Charakter anlegen“ und „Freie Rollen ansehen“ begleitet dich, bis du einen hast.
          </li>
          <li>
            <strong>Alle Charaktere der Welt:</strong> Im Story-Bereich steht oben neben „Szenen“ der Reiter „Charaktere“ (am Computer auch in der Seitenleiste). Er listet jeden Charakter der Welt mit seinem Stand: frei, gespielt von …, dein Charakter oder NPC. Du kannst nach Namen, Spieler:in und Wesen suchen und nach Stand und Wesen filtern. Admins sehen zusätzlich, wie viele Mitglieder noch keinen Charakter haben, und können freie Charaktere direkt anbieten. Die Liste lädt in Schritten, auch bei vielen Mitgliedern.
          </li>
          <li>
            <strong>Freund:innen finden:</strong> Tritt jemand einer Welt bei, sehen die Mitglieder dieser Welt oben in der Redaktion eine Karte „Willkommen, Name!“ mit „Befreunden“ und „Begrüßen“. In der Mitgliederliste einer Welt steht neben jedem Namen „Befreunden“, und auf der Freunde-Seite schlägt „Kennst du schon?“ Mitglieder deiner Welten vor. Unter „Konto“ → „Sichtbarkeit“ schaltest du die Ankündigung deines Beitritts aus, oder du stellst dich allen in der Redaktion vor.
          </li>
          <li>
            <strong>Rollen schon vor dem Beitritt:</strong> Ist „Erkunden“ eingeschaltet, erscheint in der Vorschau der Reiter „Zu vergeben“ mit den freien Rollen. In offenen Welten klickst du „Beitreten und anfragen“, bei „Auf Anfrage“ schickst du mit dem Beitrittsantrag gleich die Rolle mit. Die Admins sehen die gewünschte Rolle beim Antrag und wählen „Aufnehmen und Rolle geben“ oder „Nur aufnehmen“ (dann bleibt die Rolle als Rollenanfrage vorgemerkt).
          </li>
        </ul>
      </Section>
      <Section id="verlassen" title="16. Welt verlassen, Besitz übertragen, Konto löschen">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Welt verlassen:</strong> Unter „Welten“ erscheint beim Darüberfahren (am Handy beim Antippen) neben jeder Welt, die dir nicht gehört, ein Verlassen-Symbol. Auch auf der Weltseite gibt es „Welt verlassen“. Deine Charaktere und Beiträge bleiben in der Welt, du siehst sie nur nicht mehr. Über den Einladungslink oder eine Anfrage kommst du später wieder hinein.
          </li>
          <li>
            <strong>Besitzer:in:</strong> Die Besitzer:in einer Welt kann sie nicht verlassen. Auf der Weltseite überträgt sie den Besitz mit „Besitz übertragen“ an ein anderes Mitglied; danach ist sie Admin und kann die Welt verlassen.
          </li>
          <li>
            <strong>Konto löschen:</strong> Unter „Profil“ → „Konto“ ganz unten, nach Eingabe deines Benutzernamens. Besitzt du noch Welten mit anderen Mitgliedern, nennt die Seite sie und das Löschen geht erst nach der Übertragung. Welten, in denen du allein bist, verschwinden mit dem Konto.
          </li>
          <li>
            <strong>Was bleibt:</strong> Deine Charaktere, Szenen-Nachrichten und Wiki-Seiten bleiben für die anderen erhalten und stehen dann unter „Gelöschter Account“. Konto, Chats, Benachrichtigungen, Freundschaften und Redaktions-Beiträge werden gelöscht. Das lässt sich nicht rückgängig machen; vorher kannst du unter „Konto“ deine Daten herunterladen.
          </li>
        </ul>
      </Section>

      <Section id="benachrichtigungen" title="17. Benachrichtigungen aus mehreren Welten">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Nur diese Welt:</strong> Unter „Profil“ → „Benachrichtigungen“ gibt es „In der Glocke nur die aktuelle Welt zeigen“ (sichtbar, sobald du in mehr als einer Welt Figuren hast). Dann siehst du in der Glocke nur, was zur aktiven Welt gehört, dazu Weltübergreifendes wie Freundschaften und Abzeichen. Meldungen anderer Welten bleiben ungelesen, bis du dorthin wechselst.
          </li>
          <li>
            <strong>Andere Welt öffnen:</strong> Tippst du auf eine Benachrichtigung aus einer anderen Welt, wechselt die App in diese Welt und öffnet die Szene oder den Beitrag dort; Seitenleiste und Figur passen dann zur Welt. Das gilt auch für Push-Nachrichten und für Links zu Szenen.
          </li>
          <li>
            <strong>Push stummschalten:</strong> Einzelne Welten oder Figuren stellst du unter „Stumm schalten“ ab; die Glocke zeigt sie trotzdem, solange der Schalter oben aus ist.
          </li>
        </ul>
      </Section>

      <Section id="passwort-vergessen" title="18. Passwort vergessen">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Link anfordern:</strong> Auf der Anmeldeseite führt „Passwort vergessen?“ zu einer Seite, auf der du Benutzernamen oder E-Mail-Adresse eingibst. Du bekommst eine E-Mail mit einem Link, ob es ein Konto gibt oder nicht, steht dort aus Datenschutzgründen immer dieselbe Antwort.
          </li>
          <li>
            <strong>Neues Passwort:</strong> Der Link öffnet eine Seite für das neue Passwort. Bekannt geleakte Passwörter werden dort wie bei der Registrierung abgelehnt. Danach bist du direkt angemeldet.
          </li>
          <li>
            <strong>Link abgelaufen:</strong> Der Link gilt nur kurz und nur einmal. Ist er abgelaufen oder schon benutzt, fordere einfach einen neuen an. Kommt keine Mail an, schau im Spam-Ordner nach.
          </li>
        </ul>
      </Section>
    </div>
  );
}
