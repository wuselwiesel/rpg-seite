# Übergabe Wortwinkel (rpg-seite) – Stand 2. Oktober 2026 (main = 47f245b, Vercel grün)

Von: Agent A (Sitzung im Ordner `~/Desktop/coding`). An: den anderen Agent (Branch `claude/modest-bardeen-q29kyy`, PRs in `wuselwiesel/rpg-seite`).
Stack: Next.js (eigene Version, siehe `AGENTS.md`), React 19, Supabase, Tailwind v4, Vercel. Sprache der App und aller Antworten an die Nutzerin: **Deutsch**.

## Regeln der Nutzerin
- Verifizierte Änderungen ohne Rückfrage committen und pushen. Danach Vercel-Status prüfen: `gh api repos/wuselwiesel/rpg-seite/commits/<sha>/status --jq .state`.
- Supabase-Migrationen führt der Agent selbst im SQL-Editor des Browser-Panes aus (Projekt `vdflmmdmezaersrssdci`; die Nutzerin loggt sich selbst ein, nie Zugangsdaten tippen). Danach per `pg_policies` / `pg_get_constraintdef` prüfen. `supabase/schema.sql` ist ein Append-only-Log: neue Blöcke vor das abschließende `notify pgrst, 'reload schema'` setzen.
- Testaccount für localhost:3000: `logotestuser` (Welt „Testwelt“); das Passwort steht bewusst nicht im Repo, sondern in der Agent-Memory bzw. bei der Nutzerin.
- Zuerst Desktop testen, dann Handy. Neue Badges/Erfolge sind inzwischen gewünscht und gebaut (siehe unten); weitere Ideen kurz mit der Nutzerin abstimmen.
- **Vor dem Limit dieses Protokoll aktualisieren. Vor neuer Arbeit `git fetch` und prüfen, ob der andere Agent es schon gebaut hat** (Schrift-Vorschau und Status-Menü wurden doppelt gebaut).

## Live auf main (Grundlage, Stand 1bf8714)
- Redaktion als eigener Modus: 3-teiliger Schalter Ingame · Story · Redaktion (`src/components/mode-switch.tsx`, Handy: Menü am Modus-Knopf), eigene Seitenleiste/Tabs (`sidebar-nav.tsx`, `mobile-nav.tsx`), eigenes Farbschema `html[data-mode="redaktion"]` (`globals.css`, `mode-theme.tsx`, Init-Script in `layout.tsx`).
- Ingame hat links immer „Profil“ (aktiver Charakter).
- Verlauf im Beziehungsnetz: Beziehungen bearbeiten/löschen/hinzufügen (`relationship-timeline.tsx` ist jetzt Client-Component, `EditForm` aus `relationship-list.tsx` exportiert).
- „… würfelt gerade“ statt „schreibt gerade“ (Typing-Signal mit `kind`).
- Schrift-Vorschau/gemerkte Schrift und Status-Menü: **Version des anderen Agents** (`default-font.ts`, `presence-status*.ts`) ist maßgeblich; meine Variante wurde beim Merge verworfen.
- DB-Fix `characters_theme_format` (erlaubt beliebige Schrift-IDs `^[a-zA-Z0-9]{1,40}$`), live und in `schema.sql`.
- App-Logo: Original-Favicon = **„Schwarz-Weiß“ (`tinte`)** (Wunsch der Nutzerin, ersetzt das frühere Rosé-Icon; Dunkelmodus-Variante `public/icons/icon-dark-32.png` ist farbinvertiert). Tab-Icon wird über `lib/app-logos.ts` + `components/app-logo-sync.tsx` gesetzt; alle `link[rel~=icon]` bekommen dasselbe `href` (Next legt mehrere an). **Icon-Links dürfen nicht entfernt werden** – React verwaltet sie, das Löschen brach die Hydration (`removeChild`-Fehler). Acht Varianten in `public/icons/logos/<id>-{64,256,apple}.png`, Auswahl unter Einstellungen → Aussehen → App-Logo (`app-logos.ts`, `app-logo-picker.tsx`), pro Gerät in `localStorage` (`wortwinkel:app-logo`). Das PWA-Manifest bleibt beim Original.

## Redaktions-Profil im Instagram-Stil (live, Stand Commit nach 1bf8714)
Entscheidungen der Nutzerin: Raster+Liste umschaltbar; Banner, Bio, Zähler, Status-Zeile; freie Felder (Titel+Text, Symbol, sortierbar); eigene Akzentfarbe/Hintergrund/Schrift; angeheftete Beiträge (max. 3).
- Migration `supabase/migration_redaktion_profile.sql` (Tabelle `redaktion_profiles`, RLS: lesen = eigene oder Freund:innen, schreiben nur eigene) ist **im Supabase-SQL-Editor ausgeführt und per `pg_policies` verifiziert**, und steht in `schema.sql`.
- Code: `src/app/redaktion/profil/[userId]/page.tsx` + `profile-posts.tsx`, `src/app/redaktion/profil/bearbeiten/{page,edit-form}.tsx`, Action `saveRedaktionProfile` in `src/app/redaktion/actions.ts`, Typen in `src/lib/types.ts`. Im Browser getestet: Speichern, Status, Bio, Feld, Pin, Raster.
- Die Modus-Umschaltung links ist auf dem Desktop jetzt reine Textleiste (ohne Icons), „Redaktion“ etwas breiter; auf dem Handy bleibt das Menü mit Icons.
- Noch offen: Highlight-Kreise unter der Bio, Sichtbarkeit pro Feld, Zähler „Freund:innen“ nur im eigenen Profil (RLS auf Freundschaften nicht geprüft).

## Einstellungen, Redaktions-Chat und Chat-Blase (live)
- Einstellungen sind gegliedert: `/profile` (Liste), `/profile/konto`, `/profile/aussehen` (Palette, App-Logo, Chat-Blase an/aus), `/profile/benachrichtigungen`; Shell `src/app/profile/settings-shell.tsx`.
- Redaktions-Chat (Account-Chats): Migration `supabase/migration_redaktion_chat.sql` ist im Supabase-SQL-Editor **ausgeführt und verifiziert** (7 Policies, 2 Funktionen `is_account_chat_member` / `start_account_chat`, Realtime für `account_messages` und `account_chat_participants`). Seiten `src/app/redaktion/chat/*` (Liste, Raum, `mit/[userId]` startet Chat), Hook `src/lib/use-account-chat.ts`, Actions inkl. Bearbeiten/Löschen/Stumm/Push. Neuer Chat nur mit akzeptierten Freund:innen.
- Chat-Blase `src/components/chat-bubble.tsx` (+ `bubble-rooms.tsx`, `chat-bubble-loader.tsx` im Root-Layout, `src/app/bubble-actions.ts`): runder, ziehbarer Knopf (rastet links/rechts ein, Position und An/Aus in `localStorage`: `wortwinkel:chat-bubble-pos`, `wortwinkel:chat-bubble`), Badge für Ungelesenes, Vorschau-Pop-up bei neuen Nachrichten, Mini-Fenster mit Redaktions-Chats und „RPG“-Chats; unter „RPG“ wählt man den eigenen Charakter (gemerkt in `wortwinkel:chat-bubble-character`), mit dem gelesen und geschrieben wird. Auf `/chats`, `/redaktion/chat`, Login ausgeblendet.
- Chat-Farben (Hauptfarbe, Akzent, Hintergrund) pro Person und Chat, für Redaktions- und RPG-Chats: Tabelle `chat_themes` (`supabase/migration_chat_themes.sql`, im SQL-Editor **ausgeführt**, RLS nur eigene Zeilen), Picker `components/chat-theme-picker.tsx` (Palette-Symbol in der Chat-Kopfzeile), Style über CSS-Variablen `lib/chat-theme.ts` (baut auf `profileThemeStyle` auf), Action `app/chat-theme-actions.ts`. Mini-Fenster der Blase lesen die Farben nur.
- Chat-Blase: Zahl am Knopf zählt **nur neue Redaktions-Nachrichten** (Wunsch der Nutzerin); RPG-Ungelesenes steht nur in der Liste/auf dem Filter. Charakterwahl unter „RPG“ ist ein Dropdown.
- Chat-Menü: Drei-Punkte-Button in der Chat-Kopfzeile (`components/chat-theme-picker.tsx`, enthält „Chat-Farben“ aufklappbar und „Stumm schalten“).
- Redaktion: Likes (Herz) und Emoji-Reaktionen auf Beiträge pro Account: Tabelle `redaktion_reactions` (`supabase/migration_redaktion_reactions.sql`, im SQL-Editor **ausgeführt**), `app/redaktion/redaktion-reaction-bar.tsx`, Actions `toggleRedaktionReaction`/`getRedaktionReactors`, Benachrichtigungstyp `redaktion_reaction`. Umfragen sind im Feed direkt ausgeklappt und einklappbar (Karte holt Umfragedaten über `lib/redaktion-feed.ts`).
- Eigene Emojis pro Welt: Tabelle `custom_emojis` (`supabase/migration_custom_emojis.sql`, im SQL-Editor **ausgeführt**), Verwaltung unter Einstellungen → Eigene Emojis (`app/profile/emojis/*`, Upload in Bucket `avatars/emoji/`), Anzeige von `:name:` über `CustomEmojiProvider` im Root-Layout (`components/custom-emoji-provider.tsx`: `EmojiText` für Klartext, `EmojiHtml` für HTML), Picker `components/custom-emoji-picker.tsx` in Chats und Editor-Toolbar (🖼️). Auch `MentionTextarea` (Kommentare) hat den Picker; die Redaktions-Kommentare nutzen jetzt ebenfalls `MentionTextarea` (ohne Charaktere).
- Im Test-Account liegt ein Selbsttest-Chat (`00000000-0000-4000-8000-0000000000c1`, nur `logotestuser` als Teilnehmer) – darf gelöscht werden.

## Badges und Verlauf (live)
- **Katalog** `/badges` (3 Reiter, `?bereich=charakter|redaktion|welt`): zeigt alle Badges mit „so erreichst du es“ (`description`) und „was es bedeutet“ (`meaning`), Fortschrittsbalken für den aktiven Charakter bzw. den eigenen Account. Reiter „Welt-Badges“ = eigene Badges der Welt: hier werden sie gestaltet (`CreateBadgeForm`), verliehen, entzogen und gelöscht (`src/app/badges/badge-controls.tsx`).
- **Sammlung** pro Charakter `/badges/sammlung/[characterId]` und pro Account `/badges/konto/[userId]` (Klick auf Badge-Chips im Charakter-/Redaktions-Profil). Charakter- und Account-Badges sind überall getrennt (Profil, Katalog, Verwalten, Namens-Badge).
- **Verwalten** `/badges/verwalten` (Reiter Charakter | Account): nur Haupt-Badge wählen.
- Katalog in `src/lib/badges.ts` (`AUTO_BADGES`, ~56 Charakter- + ~24 Account-Badges, per `ladder()` erzeugt; neue Metriken in `badges-server.ts` `characterMetrics`/`accountMetrics` ergänzen). Bereits vergebene Schlüssel dürfen nicht umbenannt werden (Test in `badges.test.ts`). Keine DB-Migration nötig.
- Vergabe: `after(() => syncCharacterBadges/syncAccountBadges)` nach Beitrag/Kommentar/Story-Eintrag/Redaktion sowie beim Öffnen von Katalog und Sammlung (Herzen/Follower fallen erst dann auf). Benachrichtigung führt in die Sammlung.
- Anzeige abschaltbar pro Gerät: Einstellungen → Aussehen (`badge-prefs.tsx`). Verlauf im Charakterprofil: `character-timeline.tsx`.

## Emoji-Katalog (live)
- `CustomEmojiPicker` (`src/components/custom-emoji-picker.tsx`) öffnet jetzt den vollen Katalog (`emoji-picker-react`, `emoji-catalog*.tsx`) mit der Kategorie „Eigene Emojis“ (Notion-Stil). Liefert Unicode-Emoji oder `:name: `. Genutzt in Chats, Mention-Textarea, Editor-Toolbar und beim Badge-Symbol. Am Handy als festes Fenster über der Tab-Leiste.
- Auch die Reaktionsleisten (Ingame `reaction-bar.tsx`, Redaktion `redaktion-reaction-bar.tsx`) nutzen den Katalog; eigene Emojis werden als `:name:` gespeichert und per `EmojiText` gerendert. Migration `supabase/migration_reaction_custom_emoji.sql` (Grenze `redaktion_reactions.emoji` 16 → 40 Zeichen) ist in Supabase ausgeführt.

## Gemerkte Auswahl (live)
- Zuletzt gewählter Charakter und Welt bleiben nach dem Schließen der App erhalten: die Cookies `active_character_id` / `active_world_id` haben `maxAge` 1 Jahr (`SELECTION_COOKIE_OPTIONS` in `src/lib/types.ts`, an allen `set`-Stellen benutzt). `SelectionCookieKeeper` (`src/components/selection-cookie-keeper.tsx`, im Root-Layout) macht alte Session-Cookies beim Start dauerhaft. Neue Stellen, die diese Cookies setzen, müssen die Konstante nutzen.

## Wünsche der Nutzerin: Stand
1. (erledigt) Redaktions-Feed hat jetzt den Aufbau des Ingame-Feeds: gleiche Spalte/Seitenleiste (`redaktion-sidebar.tsx`), Filterleiste, Pull-to-Refresh, unendliches Scrollen (`redaktion-feed-list.tsx`, `lib/redaktion-feed.ts`), randlose Insta-Karten in `redaktion-post-card.tsx`.
2. (erledigt) Charakterprofile im Stil des Redaktions-Profils: Banner, überlappender Avatar, Status-Zeile, Bio, eigene Felder, Raster/Liste (`?ansicht=liste`), Charakterbogen-Bereich, Highlights und Tabs bleiben. Migration `supabase/migration_character_profile.sql` (Spalten `banner_url`, `status_text`, `custom_fields` an `characters`) ist im SQL-Editor **ausgeführt**. Bearbeiten unter `/characters/[id]/edit` (gemeinsamer Editor `components/profile-fields-editor.tsx`, Parser `lib/profile-fields.ts`, auch vom Redaktions-Profil genutzt).
3. (erledigt) Eigene Emojis pro Welt inkl. Notion-artigem Katalog – siehe „Emoji-Katalog“ oben.
4. (erledigt) Badges, Katalog, Sammlungen und Mini-Timeline – siehe „Badges und Verlauf“.

## Offene Ideen / bekannte Lücken
- Redaktions-Profil: Highlight-Kreise unter der Bio, Sichtbarkeit pro Feld; Zähler „Freund:innen“ nur im eigenen Profil (RLS auf Freundschaften nicht geprüft).
- Badges: Herzen/Follower werden erst beim nächsten Sync erkannt (kein Trigger bei Erhalt); Namens-Badge nur das gewählte Haupt-Badge.
- Emoji-Katalog: Emoji-Upload-Verwaltung liegt weiter unter Einstellungen → Eigene Emojis; eigene Emojis in Feld-Symbolen der Profile werden per `EmojiText` angezeigt, aber dort gibt es noch keinen Katalog-Picker (nur Texteingabe `:name:`).
- Testdaten im Test-Account (darf die Nutzerin löschen): Selbsttest-Chat `00000000-0000-4000-8000-0000000000c1`, Emoji `:testgesicht:` (+ eine Redaktions-Reaktion damit), Welt-Badge „Ritter des Nebelhafens“, ein Test-Like.
- Bestehende ESLint-Fehler (siehe Fallstricke) sind nicht von den neuen Dateien.

## Fallstricke
- `tsconfig.tsbuildinfo` kann Typfehler verdecken: löschen und `npx tsc --noEmit; echo $?` ohne Pipe. Der Vercel-Build ist die Instanz, die zählt.
- Bereits vorhandene ESLint-Fehler `react-hooks/set-state-in-effect` (story-composer, dice-roll-form u. a.) nicht anfassen.
- Bash-`sed -i` auf macOS braucht `''`; lieber Edit-Tool/Python verwenden. Ein Fehler in einer `&&`-Kette überspringt den Rest.
- Browser-Pane: Screenshots können veraltet sein (DOM per JS prüfen), mehrfaches schnelles `navigate` kann den Dev-Server festfahren (`preview_stop` / `preview_start rpg-seite-dev`).
- Keine Zugangsdaten in Chats wiederholen; Test-Daten-Reste (Testbeiträge) sind harmlos.

## Von Agent B (Branch `claude/modest-bardeen-q29kyy`), Stand 2. Oktober 2026
Alles in `main` gemergt. Nicht im Browser getestet (nur `tsc`/ESLint/vitest).
- **Beziehungsnetz** (`src/app/characters/relationships/relationship-graph.tsx`, komplett neu): Fokus-Modus (Standard: aktiver Charakter, Direkt / + Bekannte), „Ganze Welt“, Suche, Hausfilter (Hausfarbe als Knotenrahmen), Kraft-Layout mit `d3-force` (neue Abhängigkeit), Zoom/Verschieben/Pinch (SVG hat `touch-none`), Hervorhebung beim Antippen, gekrümmte Linien bei Mehrfachbeziehungen, Charaktere ohne Beziehung als Liste. Zustand liegt im Client, nicht in der URL.
- **Eigene Emojis, Upload**: `src/components/emoji-upload-form.tsx` (gemeinsam für Einstellungen und Emoji-Katalog): Strg+V/Cmd+V, Knopf „Aus Zwischenablage“, Drag & Drop, Vorschau, Namensvorschlag. `src/lib/image-animation.ts` erkennt animierte GIF/WebP/APNG, die unverändert hochgeladen werden (vorher wurden animierte WebP/APNG zum Standbild plattgedrückt); Limit Standbild 256 KB, animiert 1 MB. Im Katalog-Popup (`custom-emoji-picker.tsx`) gibt es unten „＋ Eigenes Emoji hochladen“; nach dem Upload `router.refresh()`.
- **Badges ausblenden**: Migration `supabase/migration_badge_hidden.sql` (Spalte `badge_awards.hidden`, Update nur auf diese Spalte per Spalten-Grant + Policy `badge_awards_update_hidden`) – **muss noch im Supabase-SQL-Editor ausgeführt werden**. Bis dahin läuft alles weiter (Abfrage `withHidden` in `badges-server.ts` ignoriert Fehler), nur das Speichern des Schalters meldet einen Fehler. UI: Abschnitt „Welche Badges anzeigen?“ in `/badges/verwalten` (`VisibilityList` in `badge-controls.tsx`, Action `setBadgeHidden` entfernt ein ausgeblendetes Haupt-Badge). Ausgeblendete Badges fehlen im Profil, im Verlauf und in der Sammlung für andere; Besitzer:in sieht in Sammlung/Katalog weiter alle. `visibleBadges()` in `badges-server.ts`.
- Textfix: Badge „Stimme erhoben“ hieß „Bei Ein Umfrage abstimmen.“ → „Bei einer Umfrage abstimmen.“ (`badges.ts`).
- Offen: `PageProps`/`LayoutProps`-Typfehler lokal sind Next-generierte Typen (nicht Vercel).
