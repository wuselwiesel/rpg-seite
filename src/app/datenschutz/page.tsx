import Link from "next/link";

export const metadata = { title: "Datenschutz" };

// Verantwortliche Person: kommt aus Umgebungsvariablen (nicht im öffentlichen Code), bis sie gesetzt sind, steht ein Hinweis da.
const NAME = process.env.PRIVACY_NAME;
const ADDRESS = process.env.PRIVACY_ADDRESS;
const EMAIL = process.env.PRIVACY_EMAIL;

const h2 = "font-serif text-xl text-fg";
const p = "text-fg-soft";

function Missing({ what }: { what: string }) {
  return <span className="rounded bg-accent/15 px-1.5 py-0.5 text-sm text-accent">[{what} noch eintragen]</span>;
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 leading-relaxed">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl text-fg">Datenschutzerklärung</h1>
        <p className="text-sm text-muted">Stand: 16. Oktober 2026</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Verantwortliche</h2>
        <p className={p}>
          {NAME ?? <Missing what="Name" />}
          <br />
          {ADDRESS ? <span className="whitespace-pre-line">{ADDRESS}</span> : <Missing what="Anschrift" />}
          <br />
          E-Mail: {EMAIL ? <a href={`mailto:${EMAIL}`} className="text-accent hover:underline">{EMAIL}</a> : <Missing what="E-Mail" />}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Worum es geht</h2>
        <p className={p}>
          Wortwinkel ist ein textbasiertes Rollenspiel für einen geschlossenen Freundeskreis. Ein Konto gibt es nur mit Einladungscode. Alles, was du schreibst, siehst du und sehen die Mitglieder, für
          die du es freigibst (Mitglieder einer Welt, Freundinnen und Freunde, bei Chats die Teilnehmenden). Welten, die als öffentlich markiert sind, sehen nur angemeldete Mitglieder.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Welche Daten verarbeitet werden</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li><strong>Konto:</strong> E-Mail-Adresse, Benutzername und dein Passwort (nur als nicht umkehrbarer Hash, nie im Klartext).</li>
          <li><strong>Profil und Inhalte:</strong> Spitzname, Bilder, Charaktere samt Steckbrief, Beiträge, Kommentare, Chat-Nachrichten, Stories, Wiki-Seiten, Zeichnungen und Medien, Reaktionen, Beziehungen, Badges, Notizen und Einstellungen.</li>
          <li><strong>Nutzung:</strong> Wann du zuletzt aktiv warst, dein Online-Status (Punkt, Emoji, Text), Lesestände, wer eine Story gesehen hat und ob du gerade schreibst.</li>
          <li><strong>Technisches:</strong> Beim Aufruf fallen kurzzeitig technische Daten an (IP-Adresse, Zeitpunkt, Gerät und Browser). Sie dienen dem Betrieb und der Sicherheit.</li>
          <li><strong>Push-Benachrichtigungen:</strong> Nur wenn du sie einschaltest, speichern wir die Adresse deines Browsers beim Push-Dienst des Browser-Herstellers.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Wofür und auf welcher Grundlage</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li>Konto, Inhalte und Nutzung, um die Seite bereitzustellen: Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhältnis).</li>
          <li>Sicherheit, Fehlersuche und Missbrauchsschutz (zum Beispiel Einladungscodes, Prüfung von Passwörtern): Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</li>
          <li>Push-Benachrichtigungen: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Du kannst sie jederzeit in den Einstellungen und im Browser wieder ausschalten.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Dienstleister und Weitergabe</h2>
        <p className={p}>Wir geben keine Daten zu Werbezwecken weiter. Die Seite nutzt folgende Dienstleister; es gelten jeweils deren Bedingungen zur Auftragsverarbeitung:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li><strong>Supabase</strong> (Datenbank, Anmeldung, Dateispeicher, Versand der Anmelde-E-Mails). Der Datenbankserver steht in London (Großbritannien, Angemessenheitsbeschluss der EU).</li>
          <li><strong>Vercel Inc.</strong> (USA) als Hoster der Seite; Übermittlung auf Grundlage von EU-Standardvertragsklauseln bzw. des EU-US Data Privacy Framework.</li>
          <li><strong>Push-Dienste</strong> von Apple, Google oder Mozilla, wenn du Push einschaltest (sie übermitteln die Benachrichtigung an dein Gerät).</li>
        </ul>
        <p className={p}>Nur wenn du die jeweilige Funktion nutzt, kommen folgende Dienste dazu:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg-soft">
          <li><strong>GIF-Suche</strong> (Tenor von Google, Giphy): Dein Suchbegriff wird von unserem Server an den Dienst geschickt, nicht deine IP-Adresse. Die ausgewählten GIFs lädt dein Browser vom Anbieter.</li>
          <li><strong>Musiksuche</strong> (iTunes Search von Apple): Dein Suchbegriff wird von unserem Server weitergegeben.</li>
          <li><strong>Eingebettete Inhalte</strong> (YouTube im erweiterten Datenschutzmodus, Spotify, SoundCloud): Beim Anzeigen lädt dein Browser Inhalte direkt vom Anbieter, dabei wird deine IP-Adresse übertragen.</li>
          <li><strong>Passwortprüfung</strong> (Have I Been Pwned): Beim Festlegen eines Passworts wird nur ein kurzer Teil seines Hashwerts abgefragt, das Passwort selbst verlässt die Seite nie.</li>
          <li><strong>KI-Zusammenfassung von Szenen</strong> (Groq bzw. Google Gemini), sofern sie eingerichtet ist: Beim Auslösen wird der Text der gewählten Szene an den Dienst übermittelt. Sie läuft nur auf deinen Wunsch.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Cookies und lokaler Speicher</h2>
        <p className={p}>
          Es werden nur technisch notwendige Cookies und Browser-Speicher genutzt: für die Anmeldung, den gewählten Charakter und die Welt, den Modus (Story, Ingame, Redaktion) sowie Darstellung,
          Entwürfe und Einstellungen auf deinem Gerät. Es gibt keine Werbung, kein Tracking und keine Analyse-Werkzeuge. Für diese Speicherung ist keine Einwilligung nötig (§ 25 Abs. 2 TDDDG).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Wie lange Daten gespeichert werden</h2>
        <p className={p}>
          Solange dein Konto besteht. Gelöschte Inhalte liegen 30 Tage im Papierkorb und sind danach endgültig weg. Wenn du dein Konto löschst, werden dein Konto und die dazugehörigen Daten gelöscht. Technische Protokolle der Dienstleister werden dort nach deren üblichen Fristen gelöscht.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Deine Rechte</h2>
        <p className={p}>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Eine Einwilligung kannst du jederzeit widerrufen. Vieles geht
          direkt in der Seite: Daten bearbeiten und löschen, Konto löschen und deine Daten herunterladen (Einstellungen → Konto). Für alles andere schreib an die oben genannte E-Mail-Adresse.
        </p>
        <p className={p}>
          Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel der in deinem Bundesland zuständigen Landesdatenschutzbehörde.
        </p>
      </section>

      <p className="text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
