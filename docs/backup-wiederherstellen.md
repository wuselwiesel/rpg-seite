# Datenbank-Backup (einmal täglich, 7 Tage)

**Was:** Der Workflow `.github/workflows/backup.yml` sichert die Datenbank (Schemas `public`, `auth`, `storage`-Metadaten, `hundeplan`) täglich um 05:17 Uhr (Sommerzeit; im Winter 04:17 Uhr). Jede Sicherung ist komprimiert (`pg_dump -Fc -Z9`) und **verschlüsselt** (AES-256, Kennwort = Secret `BACKUP_PASSPHRASE`), weil das Repository öffentlich ist. Sie liegt als Artefakt des jeweiligen Laufs unter *GitHub → Actions → Datenbank-Backup* und wird nach **7 Tagen** automatisch gelöscht (höchstens 7 Dateien, jeweils wenige MB). Schlägt ein Lauf fehl, schickt GitHub eine E-Mail.

**Nicht enthalten:** die Dateien im Storage (Bilder, Videos; derzeit ca. 140 MB, 607 Dateien) – in der Datenbank steht nur ihre Adresse. Sitzungen/Anmelde-Token (werden nach dem Zurückspielen neu angelegt, alle melden sich neu an).

## Einrichtung (einmalig, im Terminal im Projektordner)
1. In Supabase: *Project → Connect → Session pooler → URI* kopieren (GitHub erreicht die Datenbank nur über den Pooler, nicht über die direkte Adresse). Das Datenbank-Passwort einsetzen.
2. ```bash
   gh secret set SUPABASE_DB_URL
   ```
   (fragt nach dem Wert, einfügen, Enter). **In einem eigenen Terminal-Fenster** ausführen, nicht mit `!` im Claude-Chat (dort gibt es kein Eingabefeld, das Secret wird leer). Es muss „✓ Set Actions secret …“ erscheinen. Kein Leerzeichen am Anfang oder Ende mitkopieren, keine `< >` um das Passwort; das Passwort am besten nur aus Buchstaben und Ziffern. Der Workflow prüft die Form vorab und meldet Fehler mit Länge (ohne den Wert zu zeigen).
3. Ein **langes eigenes Kennwort** wählen, im Passwortmanager speichern (**ohne dieses Kennwort sind die Sicherungen wertlos**) und eintragen:
   ```bash
   gh secret set BACKUP_PASSPHRASE
   ```
4. Probelauf: `gh workflow run backup.yml`, danach `gh run list --workflow backup.yml` bzw. im Reiter Actions ansehen.

## Wiederherstellen
1. Artefakt herunterladen (Actions → Lauf → Artifacts), entpacken: Datei `db-….dump.enc`.
2. Entschlüsseln:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in db-JJJJ-MM-TT_HHMMZ.dump.enc -out backup.dump
   ```
3. Inhalt ansehen: `pg_restore --list backup.dump` (am Mac ist `pg_restore` nicht vorinstalliert: `brew install libpq` oder bei laufendem Docker `docker run --rm -v "$PWD":/d postgres:17-alpine pg_restore --list /d/backup.dump`). Die Datei beginnt mit `PGDMP`.
4. Zurückspielen (am besten in ein **neues** Supabase-Projekt oder lokal, nicht blind über die Produktion):
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists -d "<DB-URL>" backup.dump
   ```
   Einzelne Tabelle: `pg_restore -t notes -d "<DB-URL>" backup.dump` (Tabellen vorher leeren oder in ein Zwischenschema laden).
5. Danach im Supabase-Dashboard prüfen: Zeilenzahlen, `select count(*) from auth.users`, Anmeldung testen.

## Hinweise
- GitHub deaktiviert geplante Workflows nach 60 Tagen ohne Aktivität im Repository; solange hier regelmäßig committet wird, läuft es weiter. Sonst unter *Actions* wieder einschalten.
- Zusätzlich bietet Supabase je nach Tarif eigene tägliche Sicherungen (Dashboard → Database → Backups); sie ersetzen diese hier nicht, ergänzen sie aber.
- Längere Aufbewahrung (z. B. wöchentlich 8 Wochen) wäre möglich, kostet aber Platz; bewusst nicht eingerichtet (Vorgabe: 2 pro Tag, 7 Tage).
