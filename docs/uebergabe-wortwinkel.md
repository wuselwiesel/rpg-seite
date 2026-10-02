# Übergabe Wortwinkel (rpg-seite) – Stand 2. Oktober 2026

Von: Agent A (Sitzung im Ordner `~/Desktop/coding`). An: den anderen Agent (Branch `claude/modest-bardeen-q29kyy`, PRs in `wuselwiesel/rpg-seite`).
Stack: Next.js (eigene Version, siehe `AGENTS.md`), React 19, Supabase, Tailwind v4, Vercel. Sprache der App und aller Antworten an die Nutzerin: **Deutsch**.

## Regeln der Nutzerin
- Verifizierte Änderungen ohne Rückfrage committen und pushen. Danach Vercel-Status prüfen: `gh api repos/wuselwiesel/rpg-seite/commits/<sha>/status --jq .state`.
- Supabase-Migrationen führt der Agent selbst im SQL-Editor des Browser-Panes aus (Projekt `vdflmmdmezaersrssdci`; die Nutzerin loggt sich selbst ein, nie Zugangsdaten tippen). Danach per `pg_policies` / `pg_get_constraintdef` prüfen. `supabase/schema.sql` ist ein Append-only-Log: neue Blöcke vor das abschließende `notify pgrst, 'reload schema'` setzen.
- Testaccount für localhost:3000: `logotestuser` (Welt „Testwelt“); das Passwort steht bewusst nicht im Repo, sondern in der Agent-Memory bzw. bei der Nutzerin.
- Zuerst Desktop testen, dann Handy. Badges nur nach Rücksprache mit der Nutzerin.
- **Vor dem Limit dieses Protokoll aktualisieren. Vor neuer Arbeit `git fetch` und prüfen, ob der andere Agent es schon gebaut hat** (Schrift-Vorschau und Status-Menü wurden doppelt gebaut).

## Live auf main (Commit-Stand 1bf8714 und früher)
- Redaktion als eigener Modus: 3-teiliger Schalter Ingame · Story · Redaktion (`src/components/mode-switch.tsx`, Handy: Menü am Modus-Knopf), eigene Seitenleiste/Tabs (`sidebar-nav.tsx`, `mobile-nav.tsx`), eigenes Farbschema `html[data-mode="redaktion"]` (`globals.css`, `mode-theme.tsx`, Init-Script in `layout.tsx`).
- Ingame hat links immer „Profil“ (aktiver Charakter).
- Verlauf im Beziehungsnetz: Beziehungen bearbeiten/löschen/hinzufügen (`relationship-timeline.tsx` ist jetzt Client-Component, `EditForm` aus `relationship-list.tsx` exportiert).
- „… würfelt gerade“ statt „schreibt gerade“ (Typing-Signal mit `kind`).
- Schrift-Vorschau/gemerkte Schrift und Status-Menü: **Version des anderen Agents** (`default-font.ts`, `presence-status*.ts`) ist maßgeblich; meine Variante wurde beim Merge verworfen.
- DB-Fix `characters_theme_format` (erlaubt beliebige Schrift-IDs `^[a-zA-Z0-9]{1,40}$`), live und in `schema.sql`.
- App-Logo: Original-Favicon = „Rosé“ (braun auf rosa). Acht Varianten in `public/icons/logos/<id>-{64,256,apple}.png`, Auswahl unter Einstellungen → App-Logo (`app-logos.ts`, `app-logo-picker.tsx`), pro Gerät in `localStorage` (`wortwinkel:app-logo`). Das PWA-Manifest bleibt beim Original.

## Redaktions-Profil im Instagram-Stil (live, Stand Commit nach 1bf8714)
Entscheidungen der Nutzerin: Raster+Liste umschaltbar; Banner, Bio, Zähler, Status-Zeile; freie Felder (Titel+Text, Symbol, sortierbar); eigene Akzentfarbe/Hintergrund/Schrift; angeheftete Beiträge (max. 3).
- Migration `supabase/migration_redaktion_profile.sql` (Tabelle `redaktion_profiles`, RLS: lesen = eigene oder Freund:innen, schreiben nur eigene) ist **im Supabase-SQL-Editor ausgeführt und per `pg_policies` verifiziert**, und steht in `schema.sql`.
- Code: `src/app/redaktion/profil/[userId]/page.tsx` + `profile-posts.tsx`, `src/app/redaktion/profil/bearbeiten/{page,edit-form}.tsx`, Action `saveRedaktionProfile` in `src/app/redaktion/actions.ts`, Typen in `src/lib/types.ts`. Im Browser getestet: Speichern, Status, Bio, Feld, Pin, Raster.
- Die Modus-Umschaltung links ist auf dem Desktop jetzt reine Textleiste (ohne Icons), „Redaktion“ etwas breiter; auf dem Handy bleibt das Menü mit Icons.
- Noch offen: Highlight-Kreise unter der Bio, Sichtbarkeit pro Feld, Zähler „Freund:innen“ nur im eigenen Profil (RLS auf Freundschaften nicht geprüft).

## Nächste Schritte
1. (erledigt) Einstellungen sind in Unterseiten gegliedert: `/profile` (Liste), `/profile/konto`, `/profile/aussehen`, `/profile/benachrichtigungen`; Shell in `src/app/profile/settings-shell.tsx`, Kopf `components/settings-back.tsx`.
2. Redaktions-Chat (Account-Chats, eigene Tabellen) plus schwebende, verschiebbare Chat-Blase (Profilbild, Ungelesen-Badge, Mini-Fenster, Vorschau-Pop-up, auch Rollenspiel-Chats, pro Gerät abschaltbar). Entscheidungen der Nutzerin, noch nicht gebaut.
3. Eigene Emojis pro Welt (Upload PNG/GIF/WebP max. 256 KB, `:name:`-Kürzel, Picker; Orte: Beiträge/Kommentare, Chats, Story/Wiki, Profile). Noch nicht gebaut.
4. Älteres Backlog: Charakterprofile mit Banner/Cover, Steckbrief-Feldern, Status-Zeile, Mini-Timeline; Badges (erst besprechen).

## Fallstricke
- `tsconfig.tsbuildinfo` kann Typfehler verdecken: löschen und `npx tsc --noEmit; echo $?` ohne Pipe. Der Vercel-Build ist die Instanz, die zählt.
- Bereits vorhandene ESLint-Fehler `react-hooks/set-state-in-effect` (story-composer, dice-roll-form u. a.) nicht anfassen.
- Bash-`sed -i` auf macOS braucht `''`; lieber Edit-Tool/Python verwenden. Ein Fehler in einer `&&`-Kette überspringt den Rest.
- Browser-Pane: Screenshots können veraltet sein (DOM per JS prüfen), mehrfaches schnelles `navigate` kann den Dev-Server festfahren (`preview_stop` / `preview_start rpg-seite-dev`).
- Keine Zugangsdaten in Chats wiederholen; Test-Daten-Reste (Testbeiträge) sind harmlos.
