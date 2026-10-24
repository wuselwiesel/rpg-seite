import Link from "next/link";
import { HelpSearch } from "./help-search";
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
  ["melden", "Feedback: etwas melden"],
  ["buch", "Szenen als PDF oder E-Book"],
  ["chats-archiv", "Chats archivieren und löschen"],
  ["notizen", "Notizen und Faceclaims (nur für dich)"],
  ["szenen-ordnen", "Szenen ordnen und Ordner"],
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
    <section id={id} data-help-section className="flex scroll-mt-6 flex-col gap-3 [&[hidden]]:hidden">
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
        <HelpSearch />
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
        <p className={p}>
          <strong>Ja / Nein:</strong> Im Reiter Würfeln schaltest du oben von „Würfel“ auf „Ja / Nein“. Du stellst eine Frage und das Los antwortet mit Ja oder Nein, ganz ohne Zahlen. Der Wurf steht wie ein normaler Wurf in der Szene, grün bei Ja und rot bei Nein.
          Mit <strong>Geheim</strong> sieht nur du die Antwort. Für alle anderen taucht der Wurf nirgends auf, auch nicht in der Szene, im Würfelverlauf oder im Buch, und er gibt den Zug nicht weiter.
        </p>
      </Section>

      {showRolls && (
      <Section id="verlauf" title="2. Würfelverlauf">
        <p className={p}>
          Alle Würfe deiner aktuellen Welt stehen im <strong>Würfelverlauf</strong>, neueste zuerst. Du findest ihn unter „Welt“ als Kachel „Würfelverlauf“. Mit den Filtern zeigst du nur einen Charakter oder nur
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
          <li>Du findest ihn im Profil eines Charakters als Reiter (Tipp auf deinen Charakter unten bzw. in der Seitenleiste) und in jeder Szene über das Bogen-Symbol neben „Würfeln“.</li>
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

        <h3 className="mt-2 font-medium text-fg">Gruppenchats: Admins</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Wer eine Gruppe erstellt hat, ist Admin und bleibt es. Über <strong>Mitglieder</strong> im Chat-Kopf siehst du alle in der Gruppe (Admins tragen „Admin“). Admins machen andere mit <strong>Zum Admin machen</strong> zu Admins, nehmen es mit <strong>Admin entfernen</strong> wieder weg, fügen Figuren hinzu, entfernen Mitglieder und ändern Name und Bild der Gruppe. Alle anderen können nur lesen, schreiben und die Gruppe verlassen. Tritt der letzte Admin aus, wird ein anderes Mitglied Admin.</li>
        </ul>

        <h3 className="mt-2 font-medium text-fg">Aus der Szene ins Wiki</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Markiere in einer Szene einen Text innerhalb eines Beitrags (zum Beispiel einen Namen oder einen Satz). Es erscheint <strong>Ins Wiki</strong>. Du wählst eine Wiki-Seite (steht der Name einer Figur im Text, ist ihre Seite schon vorgewählt), änderst die Notiz und tippst auf <strong>Anhängen</strong>. Die Notiz steht dann unter der Überschrift „Aus Szenen“ am Ende der Seite, mit einem Link zur Stelle in der Szene. Das geht nur bei Seiten, die du bearbeiten darfst.</li>
        </ul>

        <h3 className="mt-2 font-medium text-fg">Verlauf einer Wiki-Seite</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Unter jeder Seite steht, wer sie zuletzt geändert hat. Über <strong>Verlauf</strong> siehst du frühere Fassungen (der Stand vor jeder Bearbeitung) mit Text und Steckbrief. Wer die Seite bearbeiten darf, kann eine Fassung mit <strong>Wiederherstellen</strong> zurückholen; der jetzige Stand bleibt dabei im Verlauf erhalten.</li>
        </ul>

        <h3 className="mt-2 font-medium text-fg">Wiki-Eintrag deiner Figur</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Wenn die Admins unter „Welt bearbeiten“ <strong>Wiki-Eintrag für jede Figur</strong> einschalten (Standard: aus), hat jede Figur automatisch einen Wiki-Eintrag (Ordner „Charaktere“, Art „Person“), den alle in der Welt sehen. Gab es schon eine Seite mit dem Namen der Figur, wurde sie übernommen.</li>
          <li>Der <strong>Steckbrief</strong> zeigt die öffentlichen Angaben aus Profil und ChaBo automatisch und immer aktuell (ohne Attribute und Talente, nie Geheimes). Eigene Felder, Text und Bilder ergänzt du über <strong>Bearbeiten</strong>. Hat ein eigenes Feld denselben Titel wie eine ChaBo-Angabe, gilt das eigene.</li>
          <li>Unter <strong>Geheim (nur für dich sichtbar)</strong> beim Bearbeiten legst du Felder an, die nur du siehst. Mit <strong>Sichtbar für</strong> gibst du ein einzelnes Feld für Vertraute frei (zum Beispiel Partner:in oder beste:r Freund:in); sie sehen es dann bei dem Eintrag unter „Mit dir geteilt“. Mit <strong>Aufdecken</strong> wird ein Feld öffentlich und steht im Steckbrief, zum Beispiel wenn das Geheimnis in der Story enthüllt wird.</li>
          <li>Admins legen unter „Welt bearbeiten“ bei <strong>Felder der Wiki-Einträge (Vorlage)</strong> fest, welche Felder jeder Eintrag zu Beginn hat, öffentlich oder geheim (zum Beispiel „Beruf“, „Wohnort“, „Geheimnis“). Sie erscheinen beim Anlegen einer Figur und beim Bearbeiten ihres Eintrags als leere Zeilen.</li>
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
            <strong>Nachrichten kopieren:</strong> Beim Darüberfahren (am Handy: Nachricht antippen) erscheint an jeder Nachricht ein kleines Kopieren-Symbol, das den Text der ganzen Nachricht kopiert. Mehrere Nachrichten wählst du wie oben aus und tippst dann „Kopieren“: Sie werden untereinander mit dem Namen der Figur kopiert.
          </li>
          <li>
            <strong>Nur eine Textstelle:</strong> Markiere in einer Nachricht einen Satz oder ein paar Zeilen. Direkt daneben erscheinen „Im Chat zitieren“ und „Speichern“. Das Zitat steht im Chat mit Anführungszeichen und dem Namen; „Speichern“ legt nur die markierte Stelle in deine Sammlung (Dialog wie oben). Die Markierung kann auch über mehrere Nachrichten gehen.
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
            <strong>Auswahllisten:</strong> Admins legen unter „Einstellungen“ → „Auswahllisten“ Listen wie Wesen, Haus oder Beruf an und tragen die Einträge ein. Je Liste ist einstellbar, ob beim Anlegen und Bearbeiten eines Charakters ein Dropdown oder ein freies Textfeld erscheint. Die Liste „Wesen“ gibt es in jeder Welt: Hat sie Einträge, ersetzt sie die feste Auswahl Mensch / Vampir / Werwolf; heißt der gewählte Eintrag Vampir oder Werwolf, gelten dessen Würfelregeln weiter. Passt „Wesen“ nicht zu deiner Welt, entfernst du es mit dem Papierkorb an der Liste: Dann entfällt das Feld beim Anlegen und Bearbeiten, im Profil und in den Filtern (bereits gewählte Werte bleiben erhalten; „Wieder einschalten“ holt es zurück). Die gewählten Werte stehen im Profil. Bei jedem Eintrag kannst du unter „max“ eine <strong>Höchstzahl</strong> festlegen, zum Beispiel höchstens 2 Vampire in der Welt. Daneben steht, wie viele es schon gibt (z. B. „1/2“). Ist ein Eintrag voll, steht er im Charakterformular als „(voll)“ und lässt sich nicht mehr wählen; wer ihn schon hat, behält ihn. Leer lassen heißt unbegrenzt.
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
            <strong>Verfügbar oder beschäftigt, und wo:</strong> Auf dem Profil deines Charakters tippst du auf „Status setzen“, wählst „Verfügbar“ oder „Beschäftigt“ (zum Beispiel in einer Szene) und trägst ein, wo der Charakter gerade ist. Alle in der Welt sehen das auf dem Profil und in der Charakterliste der Welt. Nochmal auf die Wahl tippen schaltet sie aus, „Löschen“ leert beides.
          </li>
          <li>
            <strong>Charaktere prüfen:</strong> Admins schalten unter „Welt bearbeiten“ → Regeln „Neue Charaktere prüfen“ ein. Neue Charaktere normaler Mitglieder stehen dann zuerst auf „Zur Prüfung“ (Charaktere von Admins und NPCs nicht). Auf der Seite „Prüfung“ eines Charakters genehmigen Admins oder lehnen mit Hinweis ab; wer abgelehnt wurde, ändert den Charakter und reicht ihn erneut ein. Zusätzlich können Admins zu jedem Feld (Profil, Auswahllisten, ChaBo mit Angaben, Attributen, Talenten und Notizen) eine Änderung vorschlagen. Die Besitzer:in sieht alt und neu nebeneinander und übernimmt oder lehnt ab. Geheimes bleibt dabei unsichtbar. Alle Charaktere „Zur Prüfung“ stehen in der Charakterliste der Welt unter dem Filter „Zur Prüfung“.
          </li>
          <li>
            <strong>Frei anlegen:</strong> Beim Anlegen eines Charakters gibt es den Haken „Frei: noch ohne Spieler:in, zum Anbieten“. Ein freier Charakter ist kein NPC, der Haken „NPC“ bleibt unberührt. Er zählt nicht zu deinen spielbaren Charakteren und erscheint als „Frei“ in den Listen.
          </li>
          <li>
            <strong>Zu vergeben:</strong> Nachträglich geht es mit „Zu vergeben“ unter „Bearbeiten“, bei NPCs auch direkt in der NPC-Liste. Auch Hauptcharaktere lassen sich vergeben: Die Besitzer:in setzt den Haken oder bietet den Charakter einer Person an; er bleibt ein normaler Charakter und wechselt samt Geschichte das Konto. Die Figur erscheint auf der Weltseite unter „Zu vergeben“.
          </li>
          <li>
            <strong>Anfragen und Angebote:</strong> Mitglieder können eine freie Figur anfragen, ein Admin entscheidet. Admins können eine Rolle auch einem Mitglied anbieten; das Angebot muss die Person annehmen.
          </li>
          <li>
            <strong>Wo du das findest:</strong> Unter „Charaktere“ → „Angelegt“ siehst du alle von dir angelegten Charaktere mit Stand (frei, vergeben, eigen, NPC). Die Vergabe-Optionen klappen auf, wenn du den Pfeil rechts an der Karte antippst (auch in „Story → Charaktere“ und der NPC-Liste). Der Filter „Vergeben“ in „Story → Charaktere“ enthält auch deine eigenen Charaktere.
          </li>
          <li>
            <strong>Übergabe und Zurückgeben:</strong> Bei der Übergabe wechselt der Charakter samt Beiträgen, Bogen, Geheimem und Verlauf auf das Konto der neuen Besitzer:in und ist dann ein normaler Charakter (kein NPC, nicht mehr frei). Wer einen Charakter nicht mehr spielen möchte, gibt ihn unter „Bearbeiten“ → „An die Welt zurückgeben“ zurück. Alle Admins der Welt dürfen NPCs und freie Charaktere bearbeiten.
          </li>
          <li>
            <strong>Aufbau der App:</strong> Oben steht, als wer und in welcher Welt du bist; ein Tipp darauf öffnet „Du spielst“: oben die Welten als Reiter, darunter deren Charaktere alphabetisch (bei vielen mit Suche), daneben „Profil“; „Zu … wechseln“ wechselt nur die Welt. Nach einem Weltwechsel ist wieder der Charakter aktiv, den du dort zuletzt hattest (auf diesem Gerät). Daneben Glocke, Notizbuch und der Schalter für Ingame, Story und Redaktion. Die untere Leiste (am Computer die Seitenleiste) zeigt in Ingame und Story dasselbe: Feed bzw. Story, Welt, „+“, Chats und deinen Charakter (am Computer steht dort der ChaBo bzw. Steckbrief, das Profil öffnest du über „Du spielst“). „Welt“ bündelt Wiki, Charaktere, Beziehungen, Karten, Zeitleiste, Kalender, Würfelverlauf, Mitglieder und Welt-Chat, mit Suche. Ein zweiter Tipp (oder langes Drücken) auf deinen Charakter unten öffnet ebenfalls „Du spielst“. „+“ legt alles Neue an (Beitrag, Story, Szene, Wiki-Seite, Notiz, Charakter), oben wählst du, als wer. Die Redaktion ist dunkelblau und hat eigene Einträge: Neuigkeiten, Chat, Feedback und „Du“ (Spielerprofil, Meine Charaktere, Freund:innen, Badges, Änderungsverlauf, Einstellungen). Die Einstellungen öffnest du am Handy über ≡ in deinem Profil, am Computer über ≡ in der Seitenleiste.
          </li>
          <li>
            <strong>Besetzung (Rollenliste):</strong> Admins schalten unter „Einstellungen“ die „Besetzung (Rollenliste im Wiki)“ ein, zum Beispiel für Welten nach einer Serie. Im Wiki steht dann „Besetzung“: alle Rollen mit Alter, Wesen, Serie und Stand (Frei, Reserviert, Vergeben, NPC), mit Suche, Anfangsbuchstaben und Filtern. Ein Tipp auf eine Rolle zeigt die Beschreibung.
          </li>
          <li>
            <strong>Rolle anfragen:</strong> Bei einer freien Rolle schickst du „Rolle anfragen“ mit einer Begründung. Die Admins sagen zu oder lehnen ab. Nach der Zusage legst du den Charakter selbst an, der Name ist vorausgefüllt (Meldung oder Besetzung → „Charakter anlegen“). Danach steht die Rolle auf „Vergeben“. Löschst du den Charakter, wird sie wieder frei.
          </li>
          <li>
            <strong>Besetzung pflegen (Admins):</strong> Ein Tipp auf eine Rolle zeigt „Reservieren“ (für ein Mitglied oder einen Namen, mit freiem Enddatum), „Als NPC markieren“ (wird nicht besetzt), „Mit Charakter verknüpfen“ (zum Beispiel für bestehende Charaktere), „Bearbeiten“ und „Entfernen“. Unter „Verwalten“ legst du Rollen an oder übernimmst sie aus einem Wiki-Ordner (Zeilen im Format „Name (Alter) → Wesen (Beschreibung) [Serie]“, † = verstorben). Die Wiki-Seiten bleiben dabei unverändert. Wer die Welt vorab ansehen darf, sieht die Besetzung im Reiter „Besetzung“ der Vorschau, ohne Namen der Spieler:innen.
          </li>
          <li>
            <strong>Ohne Charakter erkunden:</strong> Nach dem Beitritt musst du nicht gleich einen Charakter anlegen. Du kannst Feed, Story, Wiki, Figuren und die Weltseite ansehen. Zum Schreiben, Liken und Chatten brauchst du einen Charakter; ein Hinweis mit „Charakter anlegen“ und „Freie Rollen ansehen“ begleitet dich, bis du einen hast.
          </li>
          <li>
            <strong>Alle Charaktere der Welt:</strong> Unter „Welt“ steht die Kachel „Charaktere“, im Story-Bereich zusätzlich der Reiter neben „Szenen“. Er listet jeden Charakter der Welt mit seinem Stand: frei, gespielt von …, dein Charakter oder NPC. Du kannst nach Namen, Spieler:in und Wesen suchen. Die Knöpfe „Frei“, „Vergeben“, „Meine“ und „NPCs“ filtern nach Stand; ein zweiter Tipp auf den gewählten Knopf schaltet den Filter wieder aus. Unter „Filtern“ wählst du eine bestimmte Spieler:in (zum Beispiel alle Charaktere von Hörnchen) oder ein Wesen und stellst die Sortierung ein. Admins sehen zusätzlich, wie viele Mitglieder noch keinen Charakter haben, und können freie Charaktere direkt anbieten. Die Liste lädt in Schritten, auch bei vielen Mitgliedern.
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

      <Section id="melden" title="19. Feedback: etwas melden">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Postfach:</strong> In der Redaktion gibt es den Eintrag „Feedback“. Dort schreibst du mit „Neu“ einen Fehler, einen Wunsch oder eine Frage auf, mit Titel, Beschreibung und bis zu vier Screenshots. Gerät und Browser werden automatisch mitgeschickt, die Seite davor ebenfalls (du kannst sie ändern oder leeren). Eine Kategorie (Szene, Wiki, Chat, Besetzung …) ist optional und passt sich der Seite an.
          </li>
          <li>
            <strong>Nummer und Verlauf:</strong> Jedes Ticket bekommt eine Nummer (zum Beispiel #12). Im Ticket siehst du den Stand (Offen, In Arbeit, Erledigt, Abgelehnt) und die Antworten. Antworten und Statuswechsel erscheinen sofort, ohne neu zu laden. Die Liste ist nach Stand gruppiert (Offen, In Arbeit, Abgeschlossen) und lässt sich durchsuchen. Ungelesene Tickets sind fett und haben einen Punkt, der Zähler steht am Eintrag „Tickets“. Über die drei Punkte im Ticket kopierst du den Link.
          </li>
          <li>
            <strong>Wer sieht was:</strong> Nur du und die Betreiberin sehen deine Tickets. Antwortest du auf ein erledigtes Ticket, wird es wieder geöffnet.
          </li>
        </ul>
      </Section>

      <Section id="buch" title="20. Szenen als PDF oder E-Book">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Eine Szene:</strong> In der Szene erscheint das Buch-Symbol oben, sobald du mit der Maus über die Karte fährst (am Handy: Karte antippen). Das Buch enthält die Szene mit allen Fortsetzungen. Das geht für jede Szene, die du sehen darfst, auch wenn du sie nicht angelegt hast.
          </li>
          <li>
            <strong>Alle Szenen:</strong> In der Story steht oben rechts „PDF / E-Book“. Das ist ein Buch mit allen Szenen der Welt, die du sehen darfst, nach Datum geordnet. Einen einzelnen Handlungsstrang findest du unter „Filter“.
          </li>
          <li>
            <strong>PDF und E-Book:</strong> In der Buchansicht speicherst du mit „Als PDF speichern“ (im Druckdialog „Als PDF speichern“ wählen) oder lädst das E-Book (EPUB).
          </li>
        </ul>
      </Section>

      <Section id="chats-archiv" title="21. Chats archivieren und löschen">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Archivieren:</strong> Im Chat die drei Punkte oben antippen und „Archivieren“ wählen. Der Chat verschwindet aus deiner Liste und steht unten unter „Archiv“. Nur du siehst das. Schreibt jemand eine neue Nachricht, kommt der Chat von selbst zurück. Mit „Aus dem Archiv holen“ geht er sofort zurück.
          </li>
          <li>
            <strong>Löschen:</strong> Im selben Menü steht „Chat löschen“. Das löscht den Chat mit allen Nachrichten für alle und lässt sich nicht rückgängig machen. Bei zwei Personen darf jede:r löschen, bei Gruppen nur, wer die Gruppe erstellt hat. Welt-Chats lassen sich archivieren, aber nicht löschen.
          </li>
          <li>
            <strong>Gilt für:</strong> den Redaktions-Chat und die Chats in der Welt.
          </li>
        </ul>
      </Section>

      <Section id="notizen" title="22. Notizen und Faceclaims (nur für dich)">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Notizbuch:</strong> Über das Notizbuch-Symbol oben (Handy) bzw. „Notizen“ in der Seitenleiste geht ein aufgeschlagenes Buch über der Seite auf; die Notizen zu einem Charakter stehen auch im Reiter „Notizen“ seines Profils; Esc, das Kreuz oder ein Klick daneben schließt es. Am rechten Rand (am Handy oben) sitzen Karteitabs: Alle · Angeheftet · Offene Fäden · Vorlagen · Archiv · Papierkorb. Eine gespeicherte Notiz erscheint als fertige Seite; „Bearbeiten“ oder ein Tipp in den Text öffnet den Editor, „Fertig“ schließt ihn. Kästchen lassen sich auf der Seite direkt abhaken. Beim Schreiben speichert die Notiz von selbst. Mit „Aa Schriftart“ ändert sich die Schrift des markierten Textes (über 60 Schriften), unter „Darstellung“ (Symbol „T“) die der ganzen Notiz. Nur du siehst deine Notizen, auch Weltbesitzer:innen und Admins nicht.
          </li>
          <li>
            <strong>Verknüpfen:</strong> In der Notiz auf „Verknüpfen“ tippen und Charaktere, Wiki-Seiten, Szenen, gespeicherte Ausschnitte oder andere Notizen wählen. Die Marken öffnen das Ziel; andere Notizen zeigen „Verlinkt in“. Wird ein Ziel gelöscht, verschwindet nur die Verknüpfung.
          </li>
          <li>
            <strong>Schnell notieren:</strong> Das kleine Notiz-Symbol am Charakterprofil, an der Wiki-Seite und in der Szene (Zeile „Notiz“) öffnet ein Fenster mit allen Notizen dazu und einem Feld zum schnellen Aufschreiben. Die Notiz ist dann schon verknüpft (Strg/Cmd + Enter speichert).
          </li>
          <li>
            <strong>Im Text verlinken:</strong> In der Notiz mit „@“ Charaktere und Wiki-Seiten erwähnen oder mit „[[“ eine Wiki-Seite nennen. Beim Speichern entsteht dazu von selbst eine Verknüpfung (oben bei den Marken).
          </li>
          <li>
            <strong>Aus der Szene:</strong> Markierten Text oder ausgewählte Nachrichten mit „Notiz“ ablegen: Sie landen als Zitat mit Quelle im Notizbuch und sind mit der Szene verknüpft.
          </li>
          <li>
            <strong>Ordner und Tags:</strong> In der Liste das Ordner-Symbol antippen, um einen Ordner anzulegen. In der Notiz Ordner wählen und unter „#Tag“ Tags eintippen (Komma, Leerzeichen oder Enter). In der Liste filtern die Ordner und Tags; „#tag“ in der Suche geht auch. Wird ein Ordner gelöscht, bleiben die Notizen.
          </li>
          <li>
            <strong>Wie Bear:</strong> Am Computer steht die Liste auf der linken Buchseite und die Notiz rechts, am Handy erst die Liste und dann die Notiz. Die Leiste unter der Suche („Alle Notizen“) klappt das Register auf: Ansichten, Ordnerbaum (anlegen, umbenennen, verschachteln, löschen) und Tags; Notizen lassen sich dorthin ziehen. Im Text gehen Überschriften, Listen, Tabellen, Code-Blöcke und Aufgabenlisten mit Kästchen („☑ Aufgaben“). Ein „#Wort“ im Text wird von selbst zum Tag.
          </li>
          <li>
            <strong>Offene Fäden:</strong> Der Karteitab sammelt alle nicht abgehakten Aufgaben aus allen Notizen. Ein Haken dort hakt sie auch in der Notiz ab.
          </li>
          <li>
            <strong>Welten, Ordner, Vorlagen:</strong> Oben wählst du die Welt (Notizen ohne Welt gelten überall). Ordner lassen sich bis zu drei Ebenen tief verschachteln. Mit „…“ in der Notiz wird sie zur Vorlage; „Aus Vorlage“ legt eine neue Notiz daraus an. Mitgelieferte Vorschläge stehen unter „Vorlagen“.
          </li>
          <li>
            <strong>Export und Suche:</strong> „…“ in der Notiz oder PDF/Text über der Liste speichern eine Notiz oder die gewählte Auswahl (Ordner, Tag, Welt) als PDF (im Druckdialog „Als PDF speichern“) oder als Markdown-Text. Die Suche findet Notizen im Reiter „Notizen“; mit „#tag“ nur nach Tags. Am Charakterprofil zeigt „Verbindungen“, was in deinen Notizen mit ihm zusammenhängt.
          </li>
          <li>
            <strong>Papierkorb und Archiv:</strong> Eine Notiz im Papierkorb bleibt 30 Tage erhalten (Wiederherstellen oder Endgültig löschen), danach wird sie von selbst gelöscht. Das Archiv räumt Notizen aus der Liste, ohne sie zu löschen.
          </li>
          <li>
            <strong>Liste:</strong> Sortieren nach Geändert, Erstellt oder Titel (die Wahl wird gemerkt), Ansichten „Zuletzt geändert“ und „Ohne Tag“. Mit dem Häkchen-Symbol wählst du mehrere Notizen aus (Umschalt-Klick für einen Bereich) und verschiebst, taggst, heftest an, archivierst, löschst oder exportierst sie gemeinsam.
          </li>
          <li>
            <strong>Seitenleiste (großer Bildschirm):</strong> Links stehen Ansichten, Ordnerbaum und Tag-Baum. Tags lassen sich mit „/“ verschachteln (z. B. <code>#plot/nebelhafen</code>); ein Klick auf „plot“ zeigt auch die Unter-Tags. Notizen lassen sich mit der Maus auf einen Ordner, einen Tag, das Archiv oder den Papierkorb ziehen, Ordner auf Ordner (Mitte = hinein, Rand = davor/danach). Am Handy gehen Verschieben und Tags über die Auswahl.
          </li>
          <li>
            <strong>Schreiben:</strong> Überschriften H1–H3, Markierstift, Code, Tabellen, Aufgabenlisten, Datei anhängen (bis 20 MB, nur für dich abrufbar). Mit dem Symbol „Markdown-Quelltext“ oben wechselst du zwischen Editor und Markdown. „Suchen“ (Strg/Cmd + F) sucht und ersetzt im Text. Unten zeigen „Gliederung“ die Überschriften zum Springen und die Wortzahl die Info (Zeichen, Lesezeit, erstellt, geändert). „Darstellung“ ändert Schrift, Größe und Papier, „Fokus-Modus“ blendet alles andere aus (Esc beendet).
          </li>
          <li>
            <strong>Tastenkürzel:</strong> Alt + N neue Notiz, Alt + J zu einer Notiz springen, ↑/↓ in der Liste blättern, Alt + F Fokus-Modus, Alt + Rücktaste in den Papierkorb. Die Übersicht öffnet das Tastatur-Symbol über der Liste.
          </li>
          <li>
            <strong>Offline und Import:</strong> Schreibst du ohne Netz, wird der Text im Browser aufgehoben und gespeichert, sobald du wieder online bist; nach einem Absturz fragt die Notiz, ob du Ungespeichertes wiederherstellen willst. Mit „Importieren“ (oder Ablegen auf die Liste) kommen Markdown-Dateien (.md, .txt) als Notizen herein, auch aus Bear.
          </li>
          <li>
            <strong>Faceclaim:</strong> Am eigenen Charakter (Profil unter dem Namen und oben im Charakterbogen) das kleine Gesicht-Symbol antippen: Name der Person, Link (z. B. Pinterest) und bis zu 8 Bilder. Das sieht nur dein Konto, andere sehen es nirgends. In „Meine Charaktere“ steht der Name unter dem Charakter.
          </li>
        </ul>
      </Section>

      <Section id="szenen-ordnen" title="23. Szenen ordnen und Ordner">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Ordnen:</strong> In der Story oben auf „Ordnen“ tippen. Dort legst du mit „Neuer Ordner“ Ordner an (auch Unterordner, bis zu drei Ebenen) und stellst die Szenen in die Ordner.
          </li>
          <li>
            <strong>Verschieben:</strong> Am Computer eine Szene am Griff links anfassen und auf einen Ordner oder vor eine andere Szene ziehen. Am Handy gehen die Pfeile „nach oben/unten“ und die Auswahl „Verschieben nach“. Auch Ordner lassen sich mit den Pfeilen umsortieren und über den Stift umbenennen oder in einen anderen Ordner legen.
          </li>
          <li>
            <strong>Rechte:</strong> Ordner anlegen kann jedes Mitglied. Umbenennen, verschieben und löschen dürfen die Person, die den Ordner angelegt hat, und die Welt-Admins. Eine Szene verschieben nur ihre Autor:in und die Welt-Admins. Wird ein Ordner gelöscht, bleiben die Szenen erhalten (dann ohne Ordner).
          </li>
          <li>
            <strong>In der Szene:</strong> Karten und Zeilen zeigen eine kleine Ordner-Marke (Klick = nur dieser Ordner). In der Szene selbst legst du den Ordner unter „Ändern“ fest (Autor:in oder Welt-Admin).
          </li>
          <li>
            <strong>Im Feed:</strong> Unter „Filter“ steht „Ordner“. Ist ein Ordner gewählt, erscheinen seine Szenen (samt Unterordnern) in der Reihenfolge, die du festgelegt hast.
          </li>
        </ul>
      </Section>
    </div>
  );
}
