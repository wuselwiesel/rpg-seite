import Link from "next/link";
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
  ["natur", "Besondere Natur: Werwolf und Vampir"],
  ["bogen", "Den ChaBo bearbeiten und speichern"],
  ["zufall", "Zufall und NPCs"],
  ["uebersicht", "Welches Talent braucht welche Attribute?"],
  ["kuerzel", "Tastenkürzel und Schreibhilfen"],
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

export default function HelpPage() {
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
            {TOC.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="flex gap-2 rounded-lg px-2 py-1 text-fg-soft transition hover:bg-surface-2 hover:text-accent">
                  <span className="text-muted">{i + 1}.</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
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

      <Section id="verlauf" title="2. Würfelverlauf">
        <p className={p}>
          Alle Würfe deiner aktuellen Welt stehen im <strong>Würfelverlauf</strong>, neueste zuerst. Du findest ihn links in der Seitenleiste unter „Würfelverlauf“ (am Handy im Menü „Mehr“). Mit den Filtern zeigst du nur einen Charakter oder nur
          Erfolge beziehungsweise Misserfolge. Ein Klick auf einen Wurf führt direkt zu seiner Zeile in der Szene und hebt sie kurz hervor. Mit dem Papierkorb löschst du eigene Würfe. Ein gelöschter Wurf verschwindet auch aus der Szene. Würfe aus privaten Szenen siehst du nur, wenn du die Szene auch sonst sehen darfst.
        </p>
      </Section>

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

      <Section id="natur" title="8. Besondere Natur: Werwolf und Vampir">
        <p className={p}>
          Im ChaBo kannst du unter „Besondere Natur“ Werwolf oder Vampir wählen. Dann tragen sich feste Boni bei den Attributen ein. Wechselst du zurück auf „Keine“, verschwinden sie wieder.
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

      <Section id="bogen" title="9. Den ChaBo bearbeiten und speichern">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Den ChaBo findest du in der Seitenleiste unter „ChaBo“, im Profil eines Charakters als Reiter und in jeder Szene über das Bogen-Symbol neben „Würfeln“.</li>
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
            In der Sektion <strong>Familie</strong> legst du eigene Zeilen an, zum Beispiel „Mutter“. Die Bezeichnung tippst du frei oder wählst einen Vorschlag. Auch die Überschrift lässt sich beim Bearbeiten ändern, zum Beispiel in „Freunde“.
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
            <strong>Im ChaBo:</strong> Unter „Wichtige Momente“ liegen deine Sammlungen. Du kannst sie anlegen, umbenennen und löschen, Ausschnitte lesen, Titel und Notiz ändern, aus einer Sammlung entfernen oder ganz löschen. „Zur Szene“ springt zurück und hebt die Nachrichten hervor.
          </li>
          <li>
            <strong>Als Text oder PDF:</strong> Jede Sammlung lässt sich als Textdatei laden oder über die Druckansicht als PDF speichern.
          </li>
          <li>
            <strong>Im Szenen-Chat zitieren:</strong> Nach der Auswahl das Zitat-Symbol antippen. Das Zitat landet im Chat-Eingabefeld, du kannst Text dazuschreiben oder es allein senden. Ein Klick auf das Zitat im Chat springt zu den Nachrichten in der Szene. Gespeicherte Ausschnitte kannst du im ChaBo mit „Im Chat der Szene teilen“ senden.
          </li>
        </ul>
      </Section>
    </div>
  );
}
