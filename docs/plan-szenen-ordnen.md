# Plan: Szenen ordnen und Szenen-Ordner (Stand 21. Oktober 2026)

Wunsch der Nutzerin: „man soll szenen ordnen können damit die struktur passt. Und man soll ordner erstellen können“ (Story-Bereich). Zum Weiterarbeiten: diese Datei lesen, `git fetch && git log --oneline -6 && git status`, beim ersten `[ ]` weitermachen; jeder Schritt einzeln committen und pushen (Trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).

Entwurf: neue Tabelle `story_folders` (Ordner je Welt, bis 3 Ebenen, `position`), `story_posts.folder_id` und `story_posts.sort_order` (manuelle Reihenfolge innerhalb eines Ordners; ohne Wert gilt die Anlegezeit). Neue Seite `/story/ordnung` („Ordnen“): Ordnerbaum mit den Szenen darin, Ziehen (Maus) und ↑/↓ + „In Ordner“ (Handy), Ordner anlegen/umbenennen/verschieben/löschen/umsortieren. Im Story-Feed neuer Filter „Ordner“ (`?ordner=<id>|none`); bei gewähltem Ordner gilt die manuelle Reihenfolge. Rechte: Ordner anlegen jedes Mitglied; umbenennen/löschen Ersteller:in oder Welt-Admin; Szene verschieben nur Autor:in oder Welt-Admin (RLS von `story_posts`).

- [x] 1. Migration `migration_story_folders.sql` (live + `schema.sql`), `lib/folder-tree.ts` (aus `lib/notes.ts` herausgelöst, dort re-exportiert), Aktionen in `src/app/story/folder-actions.ts`.
- [x] 2. Seite `/story/ordnung` + Client `scene-organizer.tsx`; Knopf „Ordnen“ in der Story-Kopfzeile.
- [x] 3. Ordner-Filter im Feed (erledigt). Ordner-Marke an Karten, Zeilen und Szene sowie Auswahl „Ordner“ unter „Ändern“ (`setSceneFolder`) sind seit 22. Oktober fertig und im Browser geprüft.
- [x] 4. (Hilfe, Protokoll, Tests, Handy-Ansicht der Ordnen-Seite gesehen (Ordner-Symbol statt abgeschnittener Auswahl), `next build`, alle Browser-Suiten grün; **nicht geprüft:** echtes Ziehen mit der Maus) Hilfe `/hilfe`, Protokoll `docs/uebergabe-wortwinkel.md`, Tests (`folder-tree`, Sortierfunktion), Prüfung Desktop + Handy, `next build`, E2E.
