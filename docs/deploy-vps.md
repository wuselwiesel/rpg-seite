# Wortwinkel auf Hetzner (statt Vercel)

Stand 26. Oktober 2026. Ziel: Die App läuft auf einem kleinen Hetzner-Server mit **Coolify**. Nach jedem Push auf `main` baut und startet der Server die neue Version von selbst. Die Datenbank und die Dateien bleiben bei Supabase.

Im Repo ist alles vorbereitet: `Dockerfile`, `.dockerignore`, `next.config.ts` (`output: "standalone"`, Versionskennung aus `SOURCE_COMMIT`). Bei Vercel läuft weiter alles wie bisher, bis du umschaltest.

**Keine Zugangsdaten ins Repo oder in den Chat schreiben.** Alle Werte gehören in Coolify (Umgebungsvariablen).

## Vorher wissen

- **Es eilt nicht.** Seit dem 24. Oktober läuft die Seite auf Vercel Pro. Ein Umzug lohnt sich wegen der Kosten (Vercel Pro ca. 20 $ im Monat, Hetzner ca. 5 € im Monat) und weil Vercel nach „Fluid Active CPU“ abrechnet. Das Vercel-Abo erst kündigen, wenn Hetzner einige Tage stabil läuft.
- **Geschwindigkeit:** Die Supabase-Datenbank steht in **London** (`eu-west-2`), und Vercel ist auf `lhr1` (London) gestellt: beide sind gleich nebenan. Hetzner hat **keinen Standort in London**, der nächste ist **Falkenstein oder Nürnberg** (ca. 15–25 ms nach London). Jede Seite macht mehrere Datenbank-Abfragen hintereinander, das kann Seiten spürbar träger machen (ca. 0,1–0,3 s). Das ist der Preis; man merkt es am ehesten beim Seitenwechsel. Wer das vermeiden will, müsste die Supabase-Datenbank ebenfalls nach Frankfurt umziehen (aufwendig, nicht empfohlen).
- **Dauer:** etwa 2 bis 3 Stunden für die Einrichtung, danach der Umzug in 15 Minuten.

## 1. Server mieten (Hetzner Cloud)

1. Konto auf https://console.hetzner.cloud anlegen, neues Projekt.
2. **Server hinzufügen:** Standort **Falkenstein** (oder Nürnberg), Image **Ubuntu 24.04**, Typ **2 vCPU und 4 GB RAM** (z. B. CX23 bzw. das, was Hetzner als kleinsten „Shared vCPU“-Typ mit 4 GB anbietet; Preise auf der Seite ansehen). Mit weniger als 4 GB RAM scheitert das Bauen. Umgesetzt wurde **CAX11** (Arm64/Ampere, 2 vCPU, 4 GB, ca. 7 € im Monat); der Dockerfile-Bau läuft auch auf Arm. Bei einem Fehler mit „arm64“ oder „native module“ stattdessen einen x86-Typ nehmen.
3. **SSH-Schlüssel** hinterlegen (am Mac im Terminal `ssh-keygen -t ed25519`, danach `cat ~/.ssh/id_ed25519.pub` und den Text in Hetzner einfügen). Kein Passwort-Login.
4. **Backups** einschalten (ca. 20 % Aufpreis). Die Daten selbst liegen bei Supabase, der Server ist also ersetzbar; das Backup spart nur Einrichtungszeit.
5. **Firewall** (Hetzner → Firewalls) anlegen und dem Server zuweisen: eingehend nur **22** (SSH), **80** und **443**. Port **8000** nur für die Ersteinrichtung von Coolify, danach wieder zu.
6. Die **IP-Adresse** des Servers notieren.

## 2. Server vorbereiten (einmalig, per SSH)

```
ssh root@<Server-IP>
```

Auslagerungsspeicher (damit das Bauen nicht wegen Speichermangel abbricht) und automatische Sicherheits-Updates:

```
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
apt update && apt -y upgrade && apt -y install unattended-upgrades
```

## 3. Coolify installieren

```
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Danach `http://<Server-IP>:8000` öffnen und das Admin-Konto anlegen (starkes Passwort, in den Passwort-Manager). In den Coolify-Einstellungen unter „Instance Settings“ die eigene Adresse eintragen, z. B. `https://coolify.wortwinkel.xyz` (vorher dafür einen A-Eintrag anlegen, siehe 4). Dann Port 8000 in der Hetzner-Firewall schließen.

## 4. Domain vorbereiten (bei Vercel: Domains → wortwinkel.xyz → DNS Records)

Die Domain ist bei Vercel registriert und nutzt Vercels Nameserver, die DNS-Einträge pflegst du also dort. Das Vercel-Konto bleibt auch nach dem Umzug nötig.

- A-Eintrag `app` → IP des Servers (zum Testen, bevor die Hauptadresse umzieht), TTL 60.
- A-Eintrag `coolify` → IP des Servers, TTL 60.
- Die TTL neuer Einträge ist bei Vercel standardmäßig kurz (60 Sekunden), eine Vorbereitung am Haupteintrag ist deshalb nicht nötig.
- **Auto-Renewal der Domain einschalten** (Domains → Auto Renewal), sonst läuft sie ab.

## 5. App in Coolify anlegen

**Projekt → Neue Ressource → Öffentliches Repository**: `https://github.com/wuselwiesel/rpg-seite`, Branch `main`.

- Build-Pack: **Dockerfile**
- Port: **3000**
- Domain: `https://app.wortwinkel.xyz` (Coolify holt das Zertifikat selbst)
- **Advanced → „Include Source Commit in Build“ einschalten.** Sonst bekommt der Bau `SOURCE_COMMIT` nicht und die Seite zeigt dauerhaft „Neue Version – neu laden“.
- **Automatisch ausliefern:** Coolify zeigt eine Webhook-Adresse. In GitHub unter *Settings → Webhooks* eintragen (Ereignis „Pushes“), dann baut der Server nach jedem Push neu. Alternativ in Coolify eine GitHub-App verbinden.

## 6. Umgebungsvariablen

Aus Vercel kopieren (Settings → Environment Variables). Die Werte nur im Vercel-Dashboard ansehen und direkt in Coolify einfügen.

**Beim Bauen nötig** (in Coolify „Build Variable“ anhaken, sonst fehlen sie in der fertigen App):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

**Nur zur Laufzeit:**
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET` (gleicher Wert wie bisher; derselbe steht in der Datenbank-Tabelle `app_secrets`)
- falls genutzt: `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TENOR_API_KEY`, `GIPHY_API_KEY`

`SOURCE_COMMIT` (Versionskennung) setzt Coolify selbst. **Wichtig:** Die VAPID-Schlüssel müssen **genau dieselben** bleiben, sonst verlieren alle Handys ihre Push-Erlaubnis.

Dann **Deploy** drücken. Das erste Bauen dauert 5 bis 10 Minuten (die vielen Schriftarten werden dabei geladen). Fehler stehen im Coolify-Bauprotokoll.

## 7. Tägliche Zusammenfassung (Ersatz für den Vercel-Cron)

Vercel ruft heute täglich um 17:00 UTC `/api/cron/digest` auf (`vercel.json`). Auf dem eigenen Server übernimmt das **eine** dieser zwei Möglichkeiten:

**A) Coolify (einfacher):** Bei der App **Scheduled Tasks → Hinzufügen**
- Befehl: `wget -q -O- --header="Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/digest` (`127.0.0.1` statt `localhost`: die App lauscht nur auf IPv4)
- Zeitplan: `0 17 * * *`

**B) GitHub-Aktion:** Im Repo liegt `.github/workflows/cron-digest.yml`. Sie läuft, sobald unter *Settings → Secrets and variables → Actions* die Secrets `APP_URL` (z. B. `https://wortwinkel.xyz`, ohne Schrägstrich am Ende) und `CRON_SECRET` gesetzt sind.

Nicht beides gleichzeitig, sonst bekommen alle die Zusammenfassung doppelt.

## 8. Supabase auf die neue Adresse einstellen

Supabase → Authentication → URL Configuration: **Redirect URLs** um `https://app.wortwinkel.xyz` ergänzen (die Hauptadresse `https://wortwinkel.xyz` steht schon drin). Sonst gehen Anmelde-, Bestätigungs- und Passwort-Links ins Leere.

## 9. Auf `app.wortwinkel.xyz` testen (noch nicht umziehen)

1. Anmelden (bleibt man hier angemeldet? Auf einer neuen Adresse muss man sich neu anmelden, das ist normal).
2. Szene lesen und schreiben, Bild hochladen, Chat senden, Würfeln.
3. Titelbild in einem Wiki, Notizbuch öffnen.
4. Unter `/api/version` sollte der aktuelle Commit stehen.
5. Den Cron von Hand auslösen (nur mit dem Geheimnis): `curl -H "Authorization: Bearer <CRON_SECRET>" https://app.wortwinkel.xyz/api/cron/digest` (nicht in Chat oder Verlauf kopieren).
6. Push-Benachrichtigung: auf der **Hauptadresse** gehört sie zur Hauptadresse, auf der Test-Adresse gilt sie getrennt. Der echte Push-Test geht erst nach dem Umzug.

## 10. Umziehen (Hauptadresse)

1. In Coolify bei der App die Domain `https://wortwinkel.xyz` **zusätzlich** eintragen (ohne `app.` zu löschen) und speichern.
2. In Vercel (Domains → DNS Records) einen A-Eintrag `@` auf die Server-IP anlegen, TTL 60. Lehnt Vercel ihn ab oder kommt die Seite weiter von Vercel, die Domain im Vercel-Projekt unter Settings → Domains entfernen. Vorher einen Screenshot der DNS-Liste sichern (Rückweg).
   Danach in Coolify die Scheduled Task „Tägliche Zusammenfassung“ einschalten und **bei Vercel den Cron ausschalten** (Projekt → Settings → Cron Jobs), sonst kommt die Zusammenfassung doppelt.
3. Nach der Umstellung prüfen: `https://wortwinkel.xyz/api/version` zeigt den Commit, Anmelden geht, Push-Test, Bild hochladen.
4. **Weil die Adresse gleich bleibt, behalten alle Handys ihre installierte App und ihre Push-Erlaubnis** (vorausgesetzt, die VAPID-Schlüssel sind dieselben). Angemeldete Sitzungen bleiben ebenfalls bestehen.

## 11. Zurück zu Vercel (falls etwas hakt)

Den A-Eintrag `@` in Vercel wieder löschen (und die Domain im Vercel-Projekt unter Settings → Domains wieder hinzufügen, falls sie entfernt wurde). Wegen der kurzen TTL ist man in wenigen Minuten zurück. Den Vercel-Cron wieder einschalten und die Coolify-Aufgabe ausschalten. Das Vercel-Projekt deshalb erst nach einigen stabilen Tagen löschen oder kündigen.

## 12. Danach aufräumen

- **Datenschutzseite anpassen** (`src/app/datenschutz/page.tsx`, Zeile mit „Vercel Inc. (USA) als Hoster“): Hoster ist dann **Hetzner Online GmbH** (Deutschland, Server in Falkenstein/Nürnberg), ohne US-Übermittlung für den Hoster. Das ist rechtlich wichtig, erst nach dem Umzug ändern.
- In Coolify die E-Mail-Benachrichtigung bei fehlgeschlagenem Bauen einrichten.
- `vercel.json` kann liegen bleiben, bis das Vercel-Projekt weg ist; danach löschen.

## Pflege

- Coolify und Ubuntu gelegentlich aktualisieren (Coolify: „Update“ in der Oberfläche; Ubuntu: `apt update && apt upgrade`, gelegentlich neu starten).
- Ein kostenloser Überwachungsdienst (z. B. UptimeRobot) auf `https://wortwinkel.xyz/api/version` meldet, wenn die Seite nicht antwortet.
- Festplatte im Auge behalten (Docker sammelt alte Bauten; in Coolify „Docker Cleanup“ aktivieren).
- Es gibt **kein** weltweites CDN wie bei Vercel. Für den Anfang reicht das. Bei Bedarf kann man kostenlos Cloudflare davorschalten.
