# Plan: Neue App-Struktur „Variante D“ (Stand 24. Oktober 2026) – gebaut, lokal, noch nicht gepusht

Zum Weiterarbeiten nach einer Unterbrechung: Diese Datei zuerst lesen, dann `git log --oneline -8` und `git status`, dann beim ersten Schritt mit `[ ]` weitermachen. Nach jedem Schritt hier `[x]` setzen und kurz notieren, was abweicht.

**Arbeitsregel (seit 23. Oktober):** Jeder Schritt wird lokal fertig gebaut und geprüft. Committet und gepusht wird **nur, wenn die Nutzerin es ausdrücklich sagt**. Die Schritte sind so geschnitten, dass die App nach jedem einzelnen lauffähig bleibt; die Nutzerin kann also nach jedem Schritt entscheiden, ob er raus soll.

Vorschau der Zielstruktur: Canvas „Wortwinkel – neue Struktur“, vierte Reihe (Variante D), https://claude.ai/artifact/1qLMXJnthK3psLFkppnWj3

Regeln der Nutzerin (gelten weiter): Deutsch, **keine Erklärtexte in der Oberfläche** (nur Beschriftungen), Hilfe nur in `/hilfe`, Feed bleibt wie Instagram (vor allem am Handy), keine verstreuten doppelten Knöpfe (nicht drei Chat-Knöpfe), Chat-Blase bleibt **ein- und ausschaltbar**, Testkonto `logotestuser` (Zugang siehe Agent-Memory, nie selbst Passwörter tippen), Testdaten danach per feste ID löschen, vor neuer Arbeit `git fetch` (anderer Agent).

Prüfung je Schritt: `npx tsc --noEmit`, `npx eslint <geänderte Dateien>`, `npx vitest run`, Browser-Pane (Entwicklungsserver auf Port 3000, Computer 1100 und 1440 px, Handy 375 px, hell und dunkel, in allen drei Modi), betroffene E2E-Suiten (`PLAYWRIGHT_CHROMIUM` auf chrome-headless-shell, siehe Protokoll). Hilfe (`src/app/hilfe/page.tsx`) und Protokoll (`docs/uebergabe-wortwinkel.md`) am Ende jedes Schritts ergänzen.

---

## Ziel in einem Satz
Der Modus-Schalter (Ingame · Story · Redaktion) bleibt; Ingame und Story teilen sich dieselbe Leiste (nur der erste Eintrag wechselt), die Redaktion wird ein eigener dunkelblauer Raum, und dazu kommen aus Variante A eine **Welt-Seite**, **ein einziger Erstellen-Knopf** und ein **Ich-Bereich** für den Charakter, mit Profil in einem Tipp und Charakterwechsel in ein bis zwei Tipps.

## Zielbild

**Handy, untere Leiste**
| Modus | 1 | 2 | Mitte | 4 | 5 |
|---|---|---|---|---|---|
| Ingame | Feed | Welt | + | Chats | Charakter (Bild, Name) |
| Story | Story | Welt | + | Chats | Charakter (Bild, Name) |
| Redaktion | Neuigkeiten | Chat | + | Feedback | Du |

**Handy, Kopfzeile:** links „Wer und wo“ (Charakterbild mit Welt-Abzeichen, Name ▾, Welt), rechts Glocke, Notizbuch-Symbol, Modus-Schalter. In der Redaktion links „Redaktion“ als logotestuser. Das heutige ≡-Menü oben entfällt; sein Inhalt wandert (siehe Tabelle unten) in den Ich-Bereich (≡ dort = Einstellungen) und in „Du“.

**Computer, Seitenleiste:** Wortmarke + Suche + Glocke + Hell/Dunkel; Karte „Wer und wo“; Modus-Schalter; Einträge wie die Handy-Leiste plus „Notizen“; „+ Erstellen“; Online-Liste; Schalter Chat-Blase; Hilfe. In der Redaktion färbt sich die ganze Leiste dunkelblau.

**Charakter schnell wechseln:** Bogen/Popover „Du spielst“ (alle eigenen Charaktere aller Welten, Antippen wechselt, „Profil“ öffnet ihn, „Neuer Charakter“, Welten darunter); erreichbar über „Wer und wo“, zweiter Tipp auf den Charakter-Tab, Charakterreihe im Profil und in der Seitenleiste, „als“-Auswahl im Erstellen-Bogen und im Chat. Charakter aus anderer Welt wählen wechselt die Welt mit.

## Was wohin wandert (nichts fällt weg)

| Heute | Neu |
|---|---|
| Ingame-Leiste: Feed · ChaBo · + · Chats · Profil | Feed · Welt · + · Chats · Charakter |
| Story-Leiste: Story · Wiki · + · ChaBo · Profil | Story · Welt · + · Chats · Charakter |
| Redaktion: Feed · Chat · + · Verlauf · Profil | Neuigkeiten · Chat · + · Feedback · Du |
| ChaBo als eigener Tab/Eintrag | Reiter „ChaBo“ im Charakter-Profil (Route `/characters/[id]/chabo` bleibt für Links) |
| Wiki nur im Story-Modus | Kachel auf der Welt-Seite (beide Spiel-Modi) |
| Story › Charaktere (`/story/charaktere`) | Kachel „Charaktere“ auf der Welt-Seite |
| Beziehungen, Karten, Zeitleiste/Kalender | Kacheln auf der Welt-Seite |
| Würfelverlauf (Story-Leiste, Handy-Menü) | Kachel auf der Welt-Seite (nur wenn Würfeln an) |
| Online-Liste (Seitenleiste, Handy-Menü) | Kachel „Mitglieder“; Seitenleiste behält die Online-Liste |
| Welt wechseln (Welt-Knopf oben) | Bogen „Du spielst“, Abschnitt Welten |
| Welten verwalten / Welt bearbeiten | Bogen „Du spielst“ (Link), Welt-Seite (nur mit Recht) |
| Charakter wechseln (Auswahlfeld, Menükarte, Chatlisten-Kopf) | „Wer und wo“ + Bogen „Du spielst“; Chatlisten-Kopf bleibt |
| Anwesenheit (online/offline am Charakterbild) | bleibt am Charakterbild in „Wer und wo“ und im Profil |
| Neuer Beitrag / Neue Story / Neuer Wiki-Eintrag (drei Knöpfe je nach Seite) | ein „+ Erstellen“ mit Auswahl |
| Suche (Lupe oben, Handy-Menü) | Lupe in der Seitenleiste; am Handy Suchfeld auf der Welt-Seite und Lupe im Feed-Kopf |
| Notizen (nur im Menü) | Notizbuch-Symbol oben (Handy), Eintrag „Notizen“ (Computer), Reiter im Profil, „Notiz“ im Erstellen, Notiz in der Szene |
| Tickets | „Feedback“ in der Redaktion (Route `/redaktion/tickets` bleibt) |
| Redaktion › Verlauf, Profil | im Hub „Du“ |
| Freund:innen, Meine Charaktere, Badges | „Du“ (Redaktion); Meine Charaktere zusätzlich im Bogen „Du spielst“ |
| Konto & Einstellungen, Rundgänge, App installieren, Konto wechseln, Hell/Dunkel | Einstellungen-Bogen (≡ im Charakter-Profil) und „Du“ |
| Überblick (nur App-Admin) | Eintrag in der Redaktion |
| Chat-Blase + Schalter (nur unter Aussehen) | bleibt; Schalter zusätzlich im Einstellungen-Bogen und unten in der Seitenleiste |
| Szene: Chat-Reiter | heißt „Chat der Szene“; die Szenen-Chats stehen auch in Redaktion › Chat |

---

## Reihenfolge

Grundsatz: Erst das Neue **zusätzlich** bauen (neue Seiten, neue Bausteine), dann in Schritt 5 die Leisten umstellen. So ist die App nach jedem Schritt vollständig benutzbar.

- [x] **0. Navigation als Daten + Modus-Regeln.** (erledigt 24.10.)
  - Neue Datei `src/lib/nav-model.ts`: reine Funktion `navItems(mode, ctx)` liefert die Einträge (id, Beschriftung, Ziel, Symbolname, Zahl) für Handy-Leiste und Seitenleiste aus **einer** Quelle. `ctx`: aktiver Charakter, Rechte (`storyCreate`, `wikiCreate`), Würfeln an, App-Admin, Ungelesen-Zahlen. Heute stehen dieselben Listen doppelt in `sidebar-nav.tsx` und `mobile-nav.tsx`.
  - Test `src/lib/nav-model.test.ts`: Einträge je Modus, ohne Charakter, ohne Rechte, Würfeln aus.
  - `src/lib/app-mode.ts`: Welt-Seite und die Seiten hinter den Kacheln (`/welt`, `/wiki…`, `/characters/relationships`, `/story/wuerfe`, `/story/charaktere`) und der ChaBo werden **neutral** (übernehmen den gemerkten Modus Ingame oder Story), damit man aus Ingame über „Welt › Wiki“ nicht plötzlich im Story-Modus landet. `isNeutralPath` erweitern, Tests in `app-mode.test.ts` anpassen. `/story` selbst und Szenen bleiben Story.
  - Noch keine sichtbare Änderung außer dem Modus auf diesen Seiten. E2E `mode-memory` anpassen und laufen lassen.

- [x] **1. Welt-Seite `/welt`.** (erledigt; ohne Zahlen an den Kacheln, Kalender und Zeitleiste als zwei Kacheln)
  - Neue Route `src/app/welt/page.tsx` (Server): Titel = Weltname (Serifenschrift), Suchfeld (schickt an `/search?q=`), Kacheln (2 Spalten Handy, 4 Computer): Wiki (`/wiki`, Zahl Seiten), Charaktere (`/story/charaktere`), Beziehungen (`/characters/relationships`), Karten (`/wiki/karten`), Zeitleiste (`/wiki/kalender` bzw. `/wiki/zeitleiste`, prüfen, was die Welt nutzt), Würfelverlauf (`/story/wuerfe`, nur wenn Würfeln an), Mitglieder (Online-Liste, vorhandene Komponente `online-members.tsx`/`MobileOnline` als Seite oder Bogen), Welt-Chat (vorhandener Konto-Chat der Welt, `accountKind === "world"` in `lib/account-chat.ts`; Ziel-URL ermitteln; **steht zusätzlich weiter in Redaktion › Chat**, Entscheidung der Nutzerin), „Welt verwalten“ nur mit Recht (`/worlds/[id]`).
  - Zahlen nur, wo sie billig sind (eine `count`-Abfrage je Kachel, `head: true`), sonst keine.
  - Baustein `src/components/world-tile.tsx` (Symbol, Name, Zahl). Keine Untertitel-Erklärungen.
  - Noch **nicht** in die Leisten eingehängt; vorerst nur per URL und als Eintrag im heutigen Menü erreichbar.

- [x] **2. „Wer und wo“ + Bogen „Du spielst“.** (erledigt; Liste nach Welt gruppiert, Anwesenheit am Bild in der Seitenleiste bzw. im Bogen)
  - Daten: `getAllOwnCharacters(userId)` in `src/lib/active-character.ts` (eigene, nicht NPC, nicht frei, nicht gelöscht, mit Weltname und Weltbild; `cache`). Zusammen mit `getUserWorlds`.
  - Wechseln: gleiche Welt → `setActiveCharacter` (wie heute, mit `characterPathAfterSwitch`, damit man auf Profil/ChaBo des neuen bleibt); andere Welt → `/switch-character?character=…&next=…` (setzt Charakter- und Welt-Cookie, gibt es schon). „Profil“ → `/switch-character?character=id&next=/characters/id`.
  - Bausteine:
    - `src/components/who-button.tsx`: Charakterbild (mit `PresenceControl`) + kleines Welt-Abzeichen (`WorldCover`), Name ▾, darunter Weltname. Ohne Charakter: nur Welt + „Charakter anlegen“.
    - `src/components/who-sheet.tsx`: Handy als Bogen von unten (Muster: Menü-Bogen in `mobile-nav.tsx`), Computer als Popover neben der Karte. Inhalt: Charaktere (Bild, Name, Welt, Knopf „Profil“, aktive markiert), „Neuer Charakter“, „Meine Charaktere“, Trennlinie, Welten als Chips, „Welten verwalten“.
    - `src/components/character-row.tsx`: Reihe runder Charakterbilder (aktiver mit Ring) + „Neu“; wird in Seitenleiste und Profil benutzt.
  - Einbau: Handy-Kopf ersetzt `MobileWorldPicker` durch `WhoButton`; Seitenleiste ersetzt `WorldSwitcher` + `CharacterSwitcher` + die Charakterkarte unten durch eine Karte mit `WhoButton` und `CharacterRow`.
  - Alte Bausteine (`mobile-world-picker.tsx`, `menu-character-card.tsx`, `character-switcher.tsx`) erst in Schritt 9 löschen, wenn nichts mehr sie nutzt (`ChatOwnerSwitch` bleibt).
  - Rundgang: `data-tour="world"` und `data-tour="character"` auf den neuen Knopf setzen (`src/lib/tours.ts` prüfen).

- [x] **3. Ein „+ Erstellen“.** (erledigt; Computer-Popover per Portal rechts neben der Leiste)
  - `src/components/create-menu.tsx`: Handy = Bogen, Computer = Popover unter dem Knopf.
  - Spiel: oben „als“-Chips (Charaktere **der aktiven Welt**, Antippen = `setActiveCharacter`), darunter Beitrag (`/posts/new`), Story 24 h (`/stories/new`), Szene (`/story/new`, nur `rights.storyCreate`), Wiki-Seite (`/wiki/new`, nur `rights.wikiCreate`), Notiz (Notizbuch öffnen mit neuer Notiz, `useNotebook().open` + bestehender Anlege-Weg aus `template-menu.tsx`), Neuer Charakter (`/characters/new`).
  - Redaktion: Beitrag (`/redaktion/new`), Feedback (`/redaktion/tickets/new`), Notiz, Neuer Charakter.
  - Ersetzt `MobileCreateTab` und die drei „Neuer …“-Knöpfe in `sidebar-nav.tsx`. `data-tour="compose"` bleibt am Knopf.

- [x] **4. Ich-Bereich (Charakter-Profil).** (erledigt; ≡ sitzt oben rechts im Banner)
  - `src/app/characters/[id]/page.tsx`: Reiter Beiträge · ChaBo · **Notizen** (neu, nur Besitzer:in: Notizen mit Verknüpfung zu diesem Charakter, Daten wie `TargetNotesButton`/`notes-data.ts`, Klick öffnet das Notizbuch; „Ganzes Notizbuch“). Reiter „Geplant“ bleibt für Besitzer:in.
  - Eigene Ansicht: `CharacterRow` unter dem Profiltext (schneller Wechsel, man bleibt im Profil), Benutzername ▾ öffnet „Du spielst“, am Handy rechts oben ≡ → Einstellungen-Bogen.
  - Einstellungen-Bogen `src/components/settings-sheet.tsx`: Konto, Aussehen, Benachrichtigungen, Hilfe und Rundgänge, App installieren, Hell/Dunkel, **Chat-Blase anzeigen** (Schalter, `ChatBubbleToggle` mit neuer schlanker Variante ohne Erklärzeile), Konto wechseln (falls verknüpft), Abmelden.

- [x] **5. Leisten umstellen (der eigentliche Wechsel).** (erledigt; am Computer bleibt das ≡ in der Seitenleiste, es zeigt jetzt dieselbe Liste wie der Einstellungen-Bogen)
  - `mobile-nav.tsx`: untere Leiste aus `navItems` (Tabelle oben). Charakter-Tab: Bild + Kurzname; Tipp öffnet das Profil, **zweiter Tipp auf dem eigenen Profil** öffnet „Du spielst“ (zusätzlich langes Drücken). Ohne Charakter: Tab „Charakter anlegen“. Kopf: `WhoButton`, Glocke, Notizbuch-Symbol (öffnet `NotebookProvider`), `MobileModeButton`. Das ≡-Menü und der Menü-Bogen fallen weg.
  - `sidebar-nav.tsx` + `sidebar.tsx`: Einträge aus `navItems` + „Notizen“ (öffnet das Notizbuch-Fenster), „+ Erstellen“, Online-Liste, Schalter Chat-Blase, Hilfe. `SidebarMenu` (≡) fällt weg; seine Einträge stehen im Einstellungen-Bogen bzw. in „Du“.
  - Chats-Tab: `MobileChatsTab`/`ChatsNavLink` mit Ungelesen-Zahl bleiben, jetzt in beiden Spiel-Modi.
  - Rundgänge (`src/lib/tours.ts`): Ziele `account-menu` neu setzen (auf Charakter-Tab bzw. Einstellungen), Texte der Schritte an die neue Struktur anpassen.
  - E2E: `app-flows`, `mode-memory`, `chat-bubble`, `anleitung` laufen lassen und Selektoren nachziehen.

- [x] **6. Redaktion als eigener Raum.** (erledigt; dazu Link „Änderungsverlauf“ im ChaBo-Reiter mit Filter je Charakter)
  - Farben „Nachtblau mit Messing“ (Nutzerin: „bisschen hübscher“, Vorschau D, Version 19): `globals.css` `html[data-mode="redaktion"]` ersetzt das Papiergrau-Rot-Schema.
    - Hell: Kopf, Seitenleiste, untere Leiste `#1c2540` (Schrift `#eef0f7`, gedämpft `#a9b1c9`); zweite Ebene auf Nachtblau (Modus-Schalter-Grund, Karten in der Leiste) `#26304f`, aktiver Eintrag `#2b3658` mit Schrift `#f2d99c`; Akzent Messing `#d4b06a` (Plus-Knopf, aktiver Modus, Schalter; Schrift darauf `#1c2540`), aktiver Tab unten `#e6c47e`; Fläche `#f3f4f8`, Karten `#ffffff` mit Linie `#e1e4ec` und leichtem Schatten `0 1px 2px rgba(28,37,64,.06)`; Text `#1c2236`, gedämpft `#5f6782`.
    - Seitentitel in der Redaktion in Serifenschrift (Cormorant, wie die Welt-Namen), „Redaktion“ im Kopf in `#f4ead6`. Status im Feedback als farbige Marken (Beantwortet grün `#e3f1ea`/`#1f6b4f`, In Arbeit Messing `#f6ecd6`/`#7a5a1c`), Team-Beiträge mit Marke „Team“.
    - Dunkel: Fläche `#10141f`, Karten `#171c2a`, Linien `#283048`, Leisten `#0d1222`, Messing etwas heller `#e0bf7a`; im Browser abstimmen.
    - Neue Tokens für die Leistenflächen (`--chrome`, `--on-chrome`, `--chrome-2`, `--brass`), die Kopf und Leisten in allen Modi nutzen (im Spiel = heutige Farben), damit nur die Redaktion sie einfärbt. Kontrast prüfen (Text auf Nachtblau und auf Messing ≥ 4.5:1).
  - Hub „Du“: neue Route `src/app/redaktion/du/page.tsx`: Spielerprofil (`/redaktion/profil/[userId]`), **Deine Charaktere** (`CharacterRow`, Antippen = Profil des Charakters über `/switch-character`, wechselt nach Ingame), Freund:innen, Badges, Änderungsverlauf (`/redaktion/verlauf`, siehe Entscheidung 4), Notizbuch, Überblick (nur App-Admin), Einstellungen (wie Einstellungen-Bogen).
  - Beschriftungen: „Redaktion-Feed“ → „Neuigkeiten“, „Tickets“ → „Feedback“ (nur Beschriftung, Routen bleiben).

- [x] **7. Chats aufräumen.** (erledigt bis auf den Charakter-Chip im Chat, den die Chatliste schon im Kopf hat)
  - Spiel: `/chats` = Chats des aktiven Charakters (wie heute, Kopf mit `ChatOwnerSwitch`). Unten im Chat neben dem Eingabefeld ein Charakter-Chip „Lyra ▾“ zum Wechseln (nur wenn mehrere eigene Charaktere am Chat beteiligt sein können; sonst nur Anzeige).
  - Redaktion: `/redaktion/chat` = Chat als du. Prüfen, dass die Szenen-Chats (Konto-Chats aus `scene-chat.tsx`) dort stehen und als „Szene: …“ erkennbar sind.
  - Szene: Reiter heißt „Chat der Szene“ (`story/[id]`).
  - Chat-Blase (`chat-bubble.tsx`): Filter „Alle · Redaktion · RPG“ → „Alle · Spiel · Redaktion“ (gleiche Logik, neue Beschriftung); Schalter bleibt unter Aussehen und kommt in Einstellungen-Bogen und Seitenleiste.

- [x] **8. Notizbuch überall erreichbar.** (erledigt)
  - Notizbuch-Symbol im Handy-Kopf und Eintrag „Notizen“ in der Seitenleiste (beide öffnen das Buch-Fenster über `useNotebook().open()`), Reiter „Notizen“ im Profil (Schritt 4), „Notiz“ im Erstellen (Schritt 3), Notiz in der Szene (gibt es: `scene-note.tsx`). Keine weiteren Stellen.

- [x] **9. Aufräumen und Abschluss.** (erledigt bis auf `next build` und neue Screenshots der Anleitung; siehe Protokoll „Stand 24. Oktober“)
  - Nicht mehr benutzte Bausteine löschen (`sidebar-menu.tsx`, `mobile-world-picker.tsx`, `menu-character-card.tsx`, `character-switcher.tsx`, alte Menü-Teile in `mobile-nav.tsx`), vorher mit `grep` sicherstellen, dass nichts sie importiert.
  - Hilfe `/hilfe`: Abschnitte zur Navigation, Modi, Charakterwechsel, Welt-Seite, Erstellen, Redaktion neu schreiben; Screenshots in der Anleitung (`e2e/anleitung`) neu erzeugen.
  - Protokoll `docs/uebergabe-wortwinkel.md`: Eintrag „Neue Struktur (Variante D)“ mit Dateien, Entscheidungen, Fallstricken.
  - Gesamtprüfung: `tsc`, ESLint, Vitest, `next build` (beendet den Entwicklungsserver, danach neu starten), alle E2E-Suiten, Browser-Durchgang aller Seiten in drei Modi × Handy/Computer × hell/dunkel.

---

## Entscheidungen der Nutzerin (24. Oktober)
0. **Nachtrag nach dem Bau:** Die Charakterreihen in Seitenleiste, Profil und Redaktion › Du und der Chat-Blasen-Schalter unten in der Seitenleiste sind wieder raus (zu viel Platz bzw. steht schon im Menü). Gewechselt wird über „Du spielst“.
1. **Welt-Chat**: an beiden Stellen (Welt-Seite und Redaktion › Chat).
2. **Kachel „Charaktere“** (nicht „Figuren“): führt zur Charakterliste der Welt in der Story (`/story/charaktere`). Allgemein heißt es in der Oberfläche **„Charakter“**, nie „Figur“.
3. **„Neuigkeiten“** als Name für den Redaktion-Feed: passt.
4. **Verlauf**: heißt „Änderungsverlauf“, steht im Hub „Du“ und als Link im ChaBo des jeweiligen Charakters; kein eigener Eintrag in der Leiste (Nutzerin: „passt so“).
5. **Redaktion-Farbe**: Dunkelblau, aber hübscher: Nachtblau mit Messing-Akzent (siehe Schritt 6).

## Risiken und Hinweise
- **Modus-Logik** ist der heikelste Teil (Schritt 0): Seiten können den Modus wechseln, ohne dass man es merkt. Deshalb zuerst mit Tests absichern.
- **Charakter aus anderer Welt**: Wechsel über `/switch-character` lädt die Seite neu (Cookies). Das ist gewollt; offene Entwürfe vorher nicht verlieren (Erstellen-Seiten nutzen eigene Entwürfe, prüfen).
- **Rundgänge** zeigen auf `data-tour`-Marken; nach Schritt 2, 3 und 5 jeweils alle Rundgänge einmal durchklicken.
- **E2E-Attrappen** (`e2e/*/build.mjs`) bauen Teile der Navigation nach; bei neuen Importen `genericStubs` ergänzen.
- **Keine Datenbank-Änderung** nötig (alles sind Oberfläche und Lesefunktionen). Falls doch: Migration einzeln über MCP, auch in `supabase/schema.sql` und als `supabase/migration_*.sql`.
- Umfang grob: Schritte 0–4 je eine Sitzung, Schritt 5 ein bis zwei, 6–9 je eine halbe bis ganze.
