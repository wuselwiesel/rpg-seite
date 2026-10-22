# Wortwinkel auf einem eigenen Server (statt Vercel)

Ziel: Die App läuft auf einem kleinen Server (VPS) mit **Coolify**. Nach jedem Merge in `main` baut und startet der Server die neue Version von selbst. Die Datenbank bleibt bei Supabase.

Im Repo vorbereitet: `Dockerfile`, `.dockerignore`, `next.config.ts` (`output: "standalone"`; die Versionskennung kommt bei Coolify aus `SOURCE_COMMIT`). Bei Vercel funktioniert alles weiter wie bisher.

Keine Zugangsdaten ins Repo schreiben, alle Werte gehören in Coolify (Umgebungsvariablen).

## 1. Server mieten
- Anbieter z. B. Hetzner Cloud, Standort in der EU (möglichst nah an der Supabase-Region).
- Modell mit **2 vCPU und mindestens 4 GB RAM** (z. B. CX22, etwa 4–5 € im Monat). Mit weniger RAM scheitert das Bauen.
- Ubuntu 24.04, SSH-Schlüssel hinterlegen. In der Hetzner-Firewall nur die Ports 22, 80, 443 und (nur für die Ersteinrichtung) 8000 öffnen.

## 2. Domain zeigen lassen
Beim Domain-Anbieter einen **A-Eintrag** anlegen: z. B. `app.deinedomain.de` → IP-Adresse des Servers. (Die Hauptadresse erst umstellen, wenn alles getestet ist.)

## 3. Coolify installieren
Per SSH auf den Server:

```
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Danach `http://<Server-IP>:8000` öffnen und das Admin-Konto anlegen. In den Coolify-Einstellungen die eigene Adresse (`https://coolify.deinedomain.de`) eintragen, dann kommt Coolify selbst mit HTTPS.

## 4. App anlegen
In Coolify: **Projekt → Neue Ressource → Öffentliches Repository** (`https://github.com/wuselwiesel/rpg-seite`), Branch `main`.
- Build-Pack: **Dockerfile**
- Port: **3000**
- Domain: `https://app.deinedomain.de` (Coolify holt das Zertifikat selbst)
- Auto-Deploy: Coolify zeigt eine **Webhook-Adresse**. In GitHub unter *Settings → Webhooks* eintragen (Ereignis „push“), dann wird nach jedem Merge neu gebaut. (Alternativ eine GitHub-App in Coolify verbinden.)

## 5. Umgebungsvariablen (aus Vercel kopieren: Settings → Environment Variables)
Beim Bauen nötig (in Coolify „Build Variable“ anhaken):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Nur zur Laufzeit:
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET` (gleicher Wert wie bisher, er steht auch in der Tabelle `app_secrets`)
- falls genutzt: `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TENOR_API_KEY`, `GIPHY_API_KEY`

`SOURCE_COMMIT` setzt Coolify selbst.

## 6. Tägliche Zusammenfassung (Ersatz für den Vercel-Cron)
In Coolify bei der App **Scheduled Tasks → Hinzufügen**:
- Befehl: `wget -q -O- --header="Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/digest`
- Zeitplan: `0 17 * * *` (wie bisher, UTC)

## 7. Supabase auf die neue Adresse einstellen
Supabase → Authentication → URL Configuration: **Site URL** und **Redirect URLs** um `https://app.deinedomain.de` ergänzen (sonst gehen Anmelde- und Bestätigungs-Links ins Leere).

## 8. Umziehen
1. Neue Adresse im Browser testen: anmelden, Szene schreiben, Bild hochladen, Chat, Push-Benachrichtigung.
2. Danach die Hauptadresse (A-Eintrag) auf den Server zeigen lassen und in Coolify als Domain eintragen; in Supabase ebenfalls ergänzen.
3. Auf dem Handy die installierte App einmal neu öffnen (bei neuer Adresse neu zum Home-Bildschirm hinzufügen; Push-Erlaubnis gilt je Adresse und muss neu erteilt werden).
4. Vercel-Projekt erst löschen, wenn alles läuft.

## Pflege
- Hetzner-Sicherung (Backups) für den Server einschalten (ca. 20 % Aufpreis); die Daten selbst liegen bei Supabase und werden zusätzlich vom GitHub-Backup gesichert.
- Coolify und Ubuntu gelegentlich aktualisieren (`sudo apt update && sudo apt upgrade`, in Coolify „Update“).
