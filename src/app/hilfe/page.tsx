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
  ["uebersicht", "Welches Talent braucht welche Attribute?"],
] as const;

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
          Alle Würfe deiner aktuellen Welt stehen im <strong>Würfelverlauf</strong>, neueste zuerst. Du erreichst ihn über das Würfel-Symbol oben in der Story. Mit den Filtern zeigst du nur einen Charakter oder nur
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
            In der Sektion <strong>Familie</strong> legst du eigene Zeilen an, zum Beispiel „Mutter“. Die Bezeichnung tippst du frei oder wählst einen Vorschlag.
          </li>
          <li>
            In den persönlichen Infos, in der Familie und in den Notizen kannst du mit <strong>@</strong> Charaktere deiner Welt markieren. Tippe @ und wähle den Namen aus der Liste. In der Ansicht steht nur der Name (ohne @) und ist ein Link zum Profil.
          </li>
          <li>Hattest du einen Bogen auf der alten Charakterbogen-Seite, übernimmst du ihn beim Bearbeiten mit „Aus altem Charakterbogen übernehmen“.</li>
        </ul>
      </Section>

      <Section id="uebersicht" title="10. Welches Talent braucht welche Attribute?">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-2 border-b border-line bg-surface-2 px-4 py-2 text-xs font-medium text-muted">
            <span>Talent</span>
            <span>Setzt sich zusammen aus</span>
          </div>
          <ul className="divide-y divide-line">
            {TALENT_LIST.map((name) => (
              <li key={name} className="grid grid-cols-2 gap-2 px-4 py-2 text-sm">
                <span className="text-fg">{name}</span>
                <span className="text-fg-soft">{TALENT_ATTRS[name].map((c) => nameByCode.get(c)).join(" + ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}
