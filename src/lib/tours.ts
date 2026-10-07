// Die Rundgänge der App. Jeder hat einen Titel, der sagt, worum es geht, und lässt sich einzeln starten und beliebig oft wiederholen.
// Ein Schritt springt (wenn nötig) auf seine Seite und hebt ein Element hervor; findet er es nicht (z. B. weil es am Handy anders heißt),
// steht die Erklärung trotzdem da.

// Wie ein Ziel-Element gefunden wird:
// attr = data-tour-Marke · title = title-Attribut · name = sichtbarer Name eines Links/Knopfs · href = Link mit genau diesem Ziel
export type TourMatch = { attr: string } | { title: string } | { name: string } | { href: string };

// route: feste Seite oder ein Platzhalter für etwas, das erst gefunden werden muss:
// @thread (erste Szene der Liste) · @chabo / @profile (ChaBo bzw. Profil des aktiven Charakters) · @chat (erster Chat der Liste).
// Mit "|" folgt die Seite, auf der der Platzhalter gefunden wird, z. B. "@chabo|/story".
export type TourStep = {
  title: string;
  text: string;
  route?: string;
  match?: TourMatch;
};

export type Tour = {
  id: string;
  title: string;
  // Eine Zeile für die Auswahl
  summary: string;
  steps: TourStep[];
};

export const TOURS: Tour[] = [
  {
    id: "erste-schritte",
    title: "Erste Schritte in Wortwinkel",
    summary: "Welt, Charakter, die drei Bereiche und wo du was findest.",
    steps: [
      {
        title: "Willkommen bei Wortwinkel",
        text: "Wortwinkel ist ein Ort für gemeinsames Rollenspiel: ihr schreibt Szenen, spielt mit euren Charakteren und baut zusammen eine Welt auf. Dieser Rundgang zeigt die Grundlagen. Mit „Weiter“ geht es los, mit dem Kreuz oben brichst du ab. Weitere Rundgänge findest du jederzeit im Menü unter „Rundgänge“.",
        route: "/",
      },
      {
        title: "Deine Welt",
        text: "Alles gehört zu einer Welt: Szenen, Wiki, Charaktere und Chats. Hier siehst du, in welcher Welt du gerade bist, und wechselst zu einer anderen. Neue Welten legst du unter „Deine Welten“ an oder trittst per Einladung bei.",
        route: "/",
        match: { attr: "world" },
      },
      {
        title: "Dein Charakter",
        text: "Du schreibst immer als einer deiner Charaktere. Hier wählst du, wer gerade aktiv ist. Wechselst du, ändern sich Profil, ChaBo und Chats mit. Wie viele Charaktere du hast, bestimmst du selbst.",
        route: "/",
        match: { attr: "character" },
      },
      {
        title: "Ingame, Story und Redaktion",
        text: "Drei Bereiche für verschiedene Dinge. „Ingame“ ist das soziale Netz eurer Charaktere mit Feed, Chats und Suche. „Story“ ist das eigentliche Rollenspiel: Szenen, Wiki und ChaBo. „Redaktion“ ist für euch als Spieler:innen, außerhalb der Rolle, mit eigenem Feed und Chat.",
        route: "/",
        match: { attr: "mode-switch" },
      },
      {
        title: "Neu erstellen",
        text: "Der „+“-Knopf legt je nach Bereich etwas Neues an: im Feed einen Beitrag, in der Story eine Szene, im Wiki einen Artikel.",
        route: "/",
        match: { attr: "compose" },
      },
      {
        title: "Benachrichtigungen",
        text: "Hier landet alles, was dich betrifft: wenn du in einer Szene dran bist, jemand dich erwähnt, dich in eine Szene einträgt oder eine neue Szene in deiner Welt beginnt. Was du bekommst, stellst du unter „Konto & Einstellungen“ ein.",
        route: "/",
        match: { title: "Benachrichtigungen" },
      },
      {
        title: "Menü und Hilfe",
        text: "Im Menü findest du Konto, Freund:innen, Charaktere verwalten und die Rundgänge. Die Seite „Hilfe“ erklärt Würfeln, Attribute, Talente und Tastenkürzel ausführlicher.",
        route: "/",
        match: { attr: "account-menu" },
      },
      {
        title: "Das war's",
        text: "Jetzt kennst du die Grundlagen. Die weiteren Rundgänge gehen auf einzelne Bereiche ein, zum Beispiel Szenen schreiben, Würfeln, Wiki oder ChaBo. Du kannst sie in beliebiger Reihenfolge und beliebig oft ansehen.",
        route: "/",
      },
    ],
  },
  {
    id: "feed",
    title: "Feed, Beiträge und Suche",
    summary: "Beiträge ansehen und schreiben, Storys, Suche und Profile.",
    steps: [
      {
        title: "Der Feed",
        text: "Im Bereich „Ingame“ siehst du die Beiträge aller Charaktere deiner Welt, wie in einem sozialen Netzwerk. Du kannst Beiträge liken, kommentieren und speichern. Ein Doppeltipp auf ein Bild gibt ein Herz.",
        route: "/",
        match: { name: "Feed" },
      },
      {
        title: "Story-Leiste",
        text: "Über dem Feed stehen die Storys: Bilder oder kurze Momente, die nach 24 Stunden verschwinden. Mit dem „+“ am eigenen Bild legst du eine an.",
        route: "/",
      },
      {
        title: "Beitrag schreiben",
        text: "Mit „+“ erstellst du einen Beitrag: Text, ein oder mehrere Bilder, Hashtags und @-Erwähnungen anderer Charaktere. Wer erwähnt wird, bekommt eine Benachrichtigung.",
        route: "/",
        match: { attr: "compose" },
      },
      {
        title: "Suche",
        text: "Die Suche findet Charaktere, Welten und Beiträge, auch über Hashtags. Tippe auf ein Ergebnis, um das Profil oder den Beitrag zu öffnen.",
        route: "/",
        match: { name: "Suche" },
      },
      {
        title: "Profile und Folgen",
        text: "Jedes Charakterprofil zeigt Bild, Beschreibung, Beiträge und Badges. Mit „Folgen“ siehst du die Beiträge einer Figur im Feed. Bei Charakteren deiner Welt passiert das automatisch.",
        route: "@profile|/story",
      },
    ],
  },
  {
    id: "szenen",
    title: "Szenen lesen und schreiben",
    summary: "Die Story: Szenen anlegen, mitschreiben, Mit dabei, Handlungsstränge und Kapitel.",
    steps: [
      {
        title: "Die Szenenliste",
        text: "Jede Szene ist ein eigener Handlungsstrang. Die Karten zeigen Autor:in, Ort, Zeit und einen Anfang des Textes. „Du bist dran“ markiert Szenen, in denen du weiterschreiben darfst. Tippe auf eine Karte, um sie zu öffnen.",
        route: "/story",
        match: { attr: "story-list" },
      },
      {
        title: "Filtern",
        text: "Mit dem Filter findest du Szenen nach Handlungsstrang, Ort oder Tag. Du kannst auch nur die Szenen zeigen, in denen du dran bist, gemerkte oder archivierte Szenen.",
        route: "/story",
        match: { attr: "story-filter" },
      },
      {
        title: "Neue Szene beginnen",
        text: "Eine Szene besteht aus Titel, Text, optional Ort, Zeit und Kalenderdatum. Unter „Mit dabei“ trägst du Charaktere ein, die auf jeden Fall teilnehmen. Sie bekommen eine Benachrichtigung und sehen auch geheime Szenen. Als Erzähler:in schreibst du neutral, ohne deinen Charakter.",
        route: "/story",
        match: { attr: "compose" },
      },
      {
        title: "Mitschreiben",
        text: "In einer Szene schreibt ihr abwechselnd weiter. Unten wählst du, mit welchem Charakter du schreibst. Der zuletzt benutzte steht vorn. Nach dem Senden springt die Ansicht zu deiner Nachricht.",
        route: "@thread|/story",
        match: { attr: "story-composer" },
      },
      {
        title: "Mehrere Figuren in einer Nachricht",
        text: "Schreibst du mit mehreren deiner Figuren, setz in jede Zeile den Namen davor: „Felicity: Sie ging die Treppen runter.“ und darunter „Nick: Er sah zu ihr auf.“ Beim Senden wird daraus eine Nachricht, in der jede Figur ihren eigenen farbigen Namen und Absatz hat. Es zählt der volle Name, der Vorname oder der Benutzername deiner eigenen Figuren; eine neue Zeile ohne Senden geht mit Umschalt + Enter.",
        route: "@thread|/story",
        match: { attr: "story-composer" },
      },
      {
        title: "Wer ist dran?",
        text: "Oben in der Szene steht, wer als Nächstes schreibt. Wer dran ist, bekommt eine Benachrichtigung. Das kannst du beim Senden festlegen oder offen lassen.",
        route: "@thread|/story",
        match: { attr: "turn-banner" },
      },
      {
        title: "Mit dabei und Handlungsstrang",
        text: "Über der Überschrift stehen „Vorherige Szene“, „Handlungsstrang“ und „Mit dabei“. Alles lässt sich nachträglich ändern: Charaktere hinzufügen oder entfernen, die Szene einem Handlungsstrang zuordnen und mit einer vorherigen Szene verknüpfen, so wird daraus ein Kapitelbuch.",
        route: "@thread|/story",
        match: { attr: "scene-meta" },
      },
      {
        title: "Kapitel",
        text: "Mit dem Buch-Symbol im Schreibfeld setzt du eine Kapitel-Marke oder machst aus dem nächsten Teil direkt eine neue Szene. Kapitel kannst du benennen, datieren und zusammenfassen. In langen Szenen springst du über die Kapitelleiste.",
        route: "@thread|/story",
      },
      {
        title: "Atmosphäre und Spoiler",
        text: "Eine Szene kann ein Stimmungsbild haben. Einzelne Nachrichten oder Textstellen lassen sich als Spoiler verstecken, andere sehen sie erst nach einem Klick. Die Symbole oben an der Szene sperren, archivieren oder pinnen sie.",
        route: "@thread|/story",
        match: { attr: "scene-controls" },
      },
      {
        title: "Musik zur Szene",
        text: "Über „Musik“ unter dem Titel hängen alle Mitspielenden Links an: Spotify (Titel, Album, Playlist), YouTube, SoundCloud oder eine Audiodatei. Ein Name ist optional. Auch ein Spotify-Jam-Link (aus der Spotify-App: Jam starten, Link teilen) lässt sich anhängen: Er öffnet sich in Spotify, damit alle derselben Sitzung beitreten. Mit dem Abspielen-Knopf lädt der Player des jeweiligen Titels, du hörst allein. Mit dem Personen-Symbol neben dem Titel (beim Darüberfahren, am Handy nach einem Antippen) sagst du allen mit offener Szene Bescheid: Sie bekommen den Hinweis „… hört gerade …“ und können mit einem Klick mithören. Bei Spotify springt dein Player dann an dieselbe Stelle und folgt Pause und Weiterspielen; „Selbst weiterhören“ beendet das. Niemand muss mitmachen. Ohne Spotify-Anmeldung im Browser läuft nur die 30-Sekunden-Vorschau. Entfernen darf, wer den Titel hinzugefügt hat, die Autor:in der Szene und Admins.",
        route: "@thread|/story",
        match: { attr: "scene-meta" },
      },
      {
        title: "Chat nur für diese Szene",
        text: "Neben „Schreiben“ und „Würfeln“ gibt es einen Chat für die Szene. Dort besprecht ihr, was als Nächstes passiert, ohne dass es in den Text kommt.",
        route: "@thread|/story",
      },
    ],
  },
  {
    id: "wuerfeln",
    title: "Würfeln und Schicksal",
    summary: "Proben mit Attributen und Talenten, Glückspunkte, Schicksalswürfel und eigene Schicksale.",
    steps: [
      {
        title: "In einer Szene würfeln",
        text: "Unter „Würfeln“ wirfst du einen Würfel, zum Beispiel einen W20, oder eine Probe auf ein Talent. Das Ergebnis erscheint als Nachricht in der Szene, für alle sichtbar.",
        route: "@thread|/story",
        match: { name: "Würfeln" },
      },
      {
        title: "Probe mit Werten",
        text: "Bei einer Probe zählen die Werte aus dem ChaBo deines Charakters. Wähle ein Talent oder Attribut, optional eine Gegenprobe gegen einen anderen Charakter. Würfelst du unter oder auf deinen Wert, gelingt die Probe.",
        route: "@thread|/story",
      },
      {
        title: "Glückspunkte",
        text: "Nach einem Misserfolg kannst du einen Glückspunkt einsetzen und neu würfeln. Wie viele du hast, steht im ChaBo. Auch ein Zustand wie „Betrunken“ lässt sich bei der Probe wählen, er verändert den Wurf.",
        route: "@thread|/story",
      },
      {
        title: "Würfelverlauf",
        text: "Alle Würfe deiner Welt stehen im Würfelverlauf, filterbar nach Charakter und Ergebnis. Mehr dazu in der Hilfe.",
        route: "/story",
        match: { name: "Würfelverlauf" },
      },
      {
        title: "Schicksalswürfel",
        text: "Der Schädel neben „Beginn eine neue Szene“ führt zum Schicksalswürfel. Er würfelt ein Ereignis für deine Figur, zum Beispiel eine Beziehung, eine Gefahr oder etwas aus der Vergangenheit, und postet es als Nachricht in eine Szene. Die Schwere und die Kategorien bestimmst du selbst.",
        route: "/story/schicksal",
      },
      {
        title: "Eigene Schicksale",
        text: "Unter „Eigene Schicksale“ schreibst du eigene Ereignisse für deine Welt. Mit Platzhaltern wie {character1} kommen weitere Charaktere vor. Zusätzlich lässt sich festlegen, wer dafür in Frage kommt, zum Beispiel nach Geschlecht, Wesen oder Beziehung zum ersten Charakter.",
        route: "/story/schicksal/eigene",
      },
    ],
  },
  {
    id: "wichtige-momente",
    title: "Wichtige Momente sammeln",
    summary: "Ausschnitte aus Szenen speichern, zitieren, exportieren und im Wiki zeigen.",
    steps: [
      {
        title: "Ausschnitt auswählen",
        text: "In einer Szene hat jede Nachricht ein Lesezeichen. Tippst du eines an, kannst du weitere Nachrichten markieren. So wählst du einen zusammenhängenden Abschnitt aus.",
        route: "@thread|/story",
      },
      {
        title: "Speichern oder zitieren",
        text: "Unten erscheint eine Leiste. „Speichern“ legt den Ausschnitt mit Titel, Notiz, beteiligten Charakteren und Sammlung ab. „Im Chat zitieren“ schickt ihn als Zitat in einen Chat, wo man ihn anklickt und zur Stelle springt.",
        route: "@thread|/story",
      },
      {
        title: "Im Wiki zeigen",
        text: "Beim Speichern kannst du den Ausschnitt als Wiki-Seite „Wichtiger Moment“ für die ganze Welt veröffentlichen. Das ist eine feste Kopie des Wortlauts.",
        route: "@thread|/story",
      },
      {
        title: "Im ChaBo wiederfinden",
        text: "Deine gespeicherten Momente stehen im ChaBo unter „Wichtige Momente“, geordnet in Sammlungen. Dort kannst du sie umbenennen, verschieben, als Text oder PDF exportieren und zur Stelle in der Szene springen.",
        route: "@chabo|/story",
      },
    ],
  },
  {
    id: "wiki",
    title: "Das Wiki eurer Welt",
    summary: "Artikel, Ordner, Verlinkungen, Karten, Graph, Zeitleiste und Kalender.",
    steps: [
      {
        title: "Das Wiki",
        text: "Hier sammelt ihr, was zu eurer Welt gehört: Orte, Wesen, Gruppen, Personen, Ereignisse und Mythen. Alle Mitspielenden können lesen, anlegen und bearbeiten.",
        route: "/wiki",
        match: { name: "Wiki" },
      },
      {
        title: "Artikel anlegen",
        text: "Wähle eine Art, zum Beispiel Ort oder Person, und schreibe den Artikel. Die Art bringt passende Felder und Gliederungen mit. Mit „Entwurf“ bleibt er zunächst nur für dich sichtbar.",
        route: "/wiki",
        match: { href: "/wiki/new" },
      },
      {
        title: "Verlinken",
        text: "Mit [[Titel]] verlinkst du andere Artikel, mit [[Titel|Anzeigetext]] unter anderem Namen. Fehlt der Artikel noch, legt ein Klick auf den Link ihn an. Namen aus dem Wiki werden auch in Szenen automatisch verlinkt.",
        route: "/wiki",
      },
      {
        title: "Ordner",
        text: "Ordner sortieren das Wiki. Jede:r darf Ordner anlegen, umbenennen und Artikel verschieben. Im Wiki siehst du links die Ordner zum Aufklappen und oben eine Suche.",
        route: "/wiki",
      },
      {
        title: "Karten",
        text: "Lade Landkarten oder Pläne hoch und setze Pins, die auf Wiki-Artikel verweisen. So wird der Ort zum Klick auf der Karte.",
        route: "/wiki",
        match: { href: "/wiki/karten" },
      },
      {
        title: "Graph",
        text: "Der Graph zeigt, wie Artikel miteinander verlinkt sind. Praktisch, um Zusammenhänge zu entdecken oder verwaiste Seiten zu finden.",
        route: "/wiki",
        match: { href: "/wiki/graph" },
      },
      {
        title: "Zeitleiste und Kalender",
        text: "Die Zeitleiste ordnet Ereignisse der Welt und Szenen nach Datum. Der Kalender zeigt dasselbe nach Monaten, in eurem eigenen Kalender der Welt. Beides lässt sich als PDF ausdrucken. Ereignisse trägst du direkt ein oder markierst eine Nachricht in einer Szene als Ereignis.",
        route: "/wiki",
        match: { href: "/wiki/zeitleiste" },
      },
      {
        title: "Beziehungen",
        text: "Das Beziehungsnetz zeigt, wie eure Charaktere zueinander stehen: Familie, Freundschaft, Liebe und mehr, mit Verlauf über die Zeit und Stammbaum.",
        route: "/wiki",
        match: { href: "/characters/relationships" },
      },
    ],
  },
  {
    id: "chabo",
    title: "ChaBo: der Charakterbogen",
    summary: "Attribute, Talente, Persönliches, Familie, Zufallsgenerator und Notizen.",
    steps: [
      {
        title: "Der ChaBo",
        text: "Der ChaBo ist der Charakterbogen deiner Figur. Er enthält Bild, Name, Natur, persönliche Angaben, Familie, Attribute, Talente und Notizen. Du öffnest ihn über „ChaBo“ in der Navigation.",
        route: "@chabo|/story",
        match: { name: "ChaBo" },
      },
      {
        title: "Attribute und Talente",
        text: "Attribute (zum Beispiel Mut, Intelligenz, Gewandtheit) haben einen Basiswert und einen Bonus. Aus ihnen und den Talenten ergibt sich, wie gut deine Figur eine Probe besteht. Für die Verteilung gibt es ein Punktebudget, die Hilfe erklärt die Rechnung.",
        route: "@chabo|/story",
      },
      {
        title: "Würfeln und Rückgängig",
        text: "Du musst nichts von Hand verteilen: Der Zufallsgenerator würfelt Attribute (ausgewogen oder wild) und Talente (Spezialist:in oder Allrounder:in). „Rückgängig“ stellt den vorigen Stand wieder her. Auch Namen, Alter, Hobbys und mehr lassen sich auswürfeln.",
        route: "@chabo|/story",
      },
      {
        title: "Persönliches, Familie und Geheimes",
        text: "Persönliche Angaben und Familie bestehen aus Zeilen, die du frei benennst. Mit @ verlinkst du andere Charaktere. Einzelne Zeilen und Notizen kannst du geheim halten, dann siehst nur du sie.",
        route: "@chabo|/story",
      },
      {
        title: "Besondere Natur",
        text: "Werwolf oder Vampir bringen eigene Boni und Besonderheiten. Der Zufall wählt die Natur passend zum Wesen aus, am häufigsten Mensch.",
        route: "@chabo|/story",
      },
      {
        title: "Eigene Zufallslisten",
        text: "Der Generator greift auf Listen mit Namen, Berufen, Hobbys und mehr zurück. Unter „Konto & Einstellungen“ ergänzt du eigene Einträge für deine Welt und bearbeitest sie später wieder.",
        route: "/profile/zufallslisten",
      },
    ],
  },
  {
    id: "charaktere",
    title: "Charaktere, NPCs und Profile",
    summary: "Charaktere anlegen und verwalten, NPCs, Online-Punkt, Badges und Beziehungen.",
    steps: [
      {
        title: "Charaktere verwalten",
        text: "Hier siehst du alle deine Charaktere in dieser Welt, legst neue an und wechselst den aktiven. Das Beziehungsnetz erreichst du von hier aus.",
        route: "/characters",
      },
      {
        title: "Neuer Charakter",
        text: "Gib Name, Bild und Beschreibung an. Der Zufallsgenerator kann Felder oder den ganzen Charakter würfeln. Wer es genauer will, füllt danach den ChaBo aus.",
        route: "/characters",
        match: { href: "/characters/new" },
      },
      {
        title: "NPCs",
        text: "NPCs sind Nebenfiguren ohne eigenes Spielerkonto. Du legst sie an, schreibst für sie und wandelst Charaktere bei Bedarf in NPCs um. Sie erscheinen in einer eigenen Liste.",
        route: "/characters",
      },
      {
        title: "Online oder offline",
        text: "Am Profilbild jedes Charakters steht ein Punkt: grün heißt online, grau offline. Du stellst ihn für jeden Charakter einzeln ein und er bleibt, bis du ihn änderst.",
        route: "@profile|/story",
      },
      {
        title: "Das Profil",
        text: "Das Profil zeigt Bild, Beschreibung, Beiträge und Badges. Es lässt sich in Farbe und Aufbau anpassen. Ein Klick auf das Bild vergrößert es.",
        route: "@profile|/story",
      },
      {
        title: "Badges",
        text: "Badges bekommst du für bestimmte Taten, zum Beispiel für Ausdauer oder Wiki-Arbeit. Im Katalog siehst du alle und wie man sie erreicht, das Haupt-Badge wählst du selbst. Unter Redaktion lassen sich Badges auch an Freund:innen verleihen.",
        route: "/badges",
      },
      {
        title: "Gelöschte Charaktere",
        text: "Löschst du einen Charakter, bleibt alles erhalten, was er geschrieben hat. Unter „Gelöscht“ siehst du ihn und kannst ihn wiederherstellen.",
        route: "/characters",
      },
    ],
  },
  {
    id: "chats",
    title: "Chats und Nachrichten",
    summary: "Gespräche zwischen Charakteren, Gruppen, Bilder, Reaktionen und die Chat-Blase.",
    steps: [
      {
        title: "Chats",
        text: "Hier stehen die Gespräche deiner Charaktere. Du schreibst als der Charakter, der gerade aktiv ist. Der Zähler zeigt ungelesene Nachrichten.",
        route: "/chats",
        match: { name: "Chats" },
      },
      {
        title: "Neue Nachricht und Gruppen",
        text: "Mit dem Stift oben startest du ein Gespräch mit einem Charakter deiner Welt. Aus einem Gespräch kannst du eine Gruppe machen, die Gruppe bekommt Namen und Bild.",
        route: "/chats",
      },
      {
        title: "Im Gespräch",
        text: "Du kannst Text, Bilder, Videos und GIFs senden, mit Emojis reagieren und auf Nachrichten antworten. Auch eigene Emojis, die du hochlädst, sind in jeder Welt nutzbar. Bei langen Nachrichten kann Enter oder Strg+Enter senden, das stellst du in den Einstellungen ein.",
        route: "@chat|/chats",
      },
      {
        title: "Die Chat-Blase",
        text: "Der runde Knopf am Rand öffnet deine Chats über jeder Seite, auch mitten in einer Szene. Du kannst ihn verschieben. Ein Klick auf „Vergrößern“ im Fenster öffnet den Chat ganz. In den Einstellungen schaltest du die Blase ab.",
        route: "/",
      },
      {
        title: "Zitieren",
        text: "Aus einer Szene lässt sich ein Ausschnitt in einen Chat zitieren, nur das Zitat schicken ist auch möglich. Ein Klick auf das Zitat springt zurück zur Stelle.",
        route: "/chats",
      },
    ],
  },
  {
    id: "redaktion",
    title: "Redaktion und Freund:innen",
    summary: "Der Bereich für euch als Spieler:innen: Feed, Chat, Verlauf, Freundschaften und Badges.",
    steps: [
      {
        title: "Die Redaktion",
        text: "Die Redaktion gehört euch als Spieler:innen, außerhalb der Rolle: Absprachen, Ideen, Plot-Fragen und Alltag. Du schreibst hier unter deinem Spielernamen, nicht als Charakter.",
        route: "/redaktion",
      },
      {
        title: "Redaktions-Feed",
        text: "Der Feed zeigt Beiträge aller Spieler:innen, mit Kommentaren, Reaktionen und Bildern. Du kannst Beiträge anheften, speichern und mit @ jemanden erwähnen.",
        route: "/redaktion",
      },
      {
        title: "Redaktions-Chat",
        text: "Der Chat hat Einzelgespräche, Gruppen und einen Welt-Chat. Du siehst, wer gelesen hat, wer gerade schreibt und wer online ist. Du kannst antworten, reagieren, Nachrichten anheften und suchen. Gruppen lassen sich stummschalten.",
        route: "/redaktion/chat",
      },
      {
        title: "Verlauf",
        text: "Der Verlauf zeigt, was du in der Redaktion zuletzt angesehen oder geschrieben hast, damit du schnell wieder dort ankommst.",
        route: "/redaktion/verlauf",
      },
      {
        title: "Freund:innen",
        text: "Wer in derselben Welt ist, ist automatisch mit dir befreundet. Zusätzlich schickst du hier Freundschaftsanfragen an Leute aus anderen Welten, siehst, wer online ist, und beendest Freundschaften. Freund:innen kannst du in Welten einladen und ihnen Badges verleihen.",
        route: "/friends",
      },
      {
        title: "Redaktionsprofil",
        text: "Dein Redaktionsprofil zeigt Name, Bild, Beschreibung, Status mit Emoji und Text sowie Account-Badges. Online oder offline stellst du hier ein.",
        route: "/profile",
      },
    ],
  },
  {
    id: "welten",
    title: "Welten und Mitspielende",
    summary: "Welten anlegen, beitreten, einladen und verwalten.",
    steps: [
      {
        title: "Deine Welten",
        text: "Hier siehst du alle Welten, in denen du spielst. „Betreten“ macht eine Welt zur aktiven. Feed, Story, Wiki und Chats zeigen dann nur ihre Inhalte.",
        route: "/worlds",
      },
      {
        title: "Neue Welt",
        text: "Eine Welt braucht einen Namen, ein Bild und eine kurze Beschreibung. Du wirst Besitzer:in und kannst Admins ernennen.",
        route: "/worlds",
      },
      {
        title: "Einladen und beitreten",
        text: "Du lädst Freund:innen ein oder teilst einen Einladungslink. Unter „Welten entdecken“ findest du öffentliche Welten, denen du beitreten kannst.",
        route: "/worlds",
      },
      {
        title: "Mitglieder und Admins",
        text: "Auf der Seite der Welt siehst du alle Mitglieder. Besitzer:in und Admins dürfen Mitglieder entfernen, die Welt bearbeiten und Szenen moderieren. Nur die Besitzer:in ernennt Admins und löscht die Welt.",
        route: "/worlds",
      },
    ],
  },
  {
    id: "einstellungen",
    title: "Einstellungen, Benachrichtigungen und Design",
    summary: "Benachrichtigungen, Ruhezeiten, Farben, Schrift, Emojis und Daten.",
    steps: [
      {
        title: "Konto & Einstellungen",
        text: "Hier stellst du Profil, Benachrichtigungen, Aussehen und mehr ein. Am Handy öffnest du es über das Menü oben rechts.",
        route: "/profile",
        match: { attr: "account-menu" },
      },
      {
        title: "Benachrichtigungen",
        text: "Du wählst, wofür du Meldungen bekommst, zum Beispiel für Erwähnungen, Chats, „Du bist dran“ oder neue Szenen. Du kannst Ruhezeiten festlegen, einzelne Welten oder Charaktere stummschalten und eine Zusammenfassung statt Einzelmeldungen nutzen. Auf dem Handy kommen Meldungen auch als Push, wenn du die App installiert hast.",
        route: "/profile",
      },
      {
        title: "Hell, Dunkel und Farben",
        text: "Du kannst zwischen hell und dunkel wechseln und eine Farbpalette wählen. Auch eine Standardschrift für Beiträge und Szenen lässt sich einstellen.",
        route: "/profile",
      },
      {
        title: "Eigene Emojis",
        text: "Lade eigene Emojis hoch, auch animierte. Sie gehören deinem Konto und stehen in allen Welten bereit. Im Chat erscheinen sie größer, wenn sie allein stehen.",
        route: "/profile/emojis",
      },
      {
        title: "Eigene Zufallslisten und Schicksale",
        text: "Für den Generator und den Schicksalswürfel ergänzt du pro Welt eigene Einträge. Wer in der Welt ist, kann sie benutzen.",
        route: "/profile/zufallslisten",
      },
      {
        title: "App installieren und Daten",
        text: "Wortwinkel lässt sich als App auf den Startbildschirm legen. Über das Menü installierst du sie. Deine Daten kannst du exportieren, Szenen auch als Buch oder E-Book.",
        route: "/profile",
      },
    ],
  },
];

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}
