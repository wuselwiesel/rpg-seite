# Wortwinkel auf Railway (statt Vercel)

Railway baut die App aus dem `Dockerfile` im Repo, startet sie, kümmert sich um HTTPS und deployt nach jedem Merge in `main` von selbst. Die Datenbank bleibt bei Supabase. Kosten nach Verbrauch (grob 5–8 $/Monat), darum unbedingt ein **Ausgabenlimit** setzen.

Im Repo vorbereitet: `Dockerfile`, `railway.json` (Dockerfile-Build, Prüfung auf `/login`, Neustart bei Absturz), Versionskennung aus `RAILWAY_GIT_COMMIT_SHA`, `.github/workflows/cron-digest.yml` (Ersatz für den Vercel-Cron).

Keine Zugangsdaten ins Repo schreiben: alle Werte gehören in Railway bzw. in die GitHub-Secrets.

## 1. Projekt anlegen
1. Auf railway.com mit GitHub anmelden, Hobby-Tarif wählen.
2. **New Project → Deploy from GitHub repo** → `wuselwiesel/rpg-seite`, Branch `main`. Railway erkennt das Dockerfile.
3. Beim Dienst unter **Settings → Regions** die EU-Region (Amsterdam) wählen, möglichst nah an der Supabase-Region.
4. **Settings → Usage / Billing → Usage limit** (Ausgabenlimit) setzen, z. B. 10 $.

## 2. Variablen
Beim Dienst **Variables → Raw Editor** und aus Vercel (Settings → Environment Variables) übertragen. Die ersten drei werden beim Bauen eingebrannt, Railway reicht sie dem Dockerfile automatisch als Build-Argumente weiter:

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…
VAPID_PRIVATE_KEY=…
CRON_SECRET=…
```

Falls bei Vercel genutzt, zusätzlich: `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TENOR_API_KEY`, `GIPHY_API_KEY`. `CRON_SECRET` muss derselbe Wert sein wie bisher (er steht auch in der Tabelle `app_secrets`). Nach dem Eintragen baut Railway neu.

## 3. Erst testen
Unter **Settings → Networking → Generate Domain** gibt Railway eine Adresse wie `rpg-seite-production.up.railway.app`. Dort anmelden und prüfen: Szene schreiben, Bild hochladen, Chat.

Für diese Adresse in Supabase (Authentication → URL Configuration) **Redirect URLs** um `https://<die-Railway-Adresse>` ergänzen, sonst gehen Anmelde- und Bestätigungs-Links ins Leere.

## 4. Eigene Domain umstellen
1. Railway: **Settings → Networking → Custom Domain** → `wortwinkel.xyz` eintragen. Railway zeigt, welchen DNS-Eintrag du beim Domain-Anbieter setzen musst (CNAME, bei der Hauptdomain je nach Anbieter ALIAS/ANAME oder „CNAME flattening“) und meist einen TXT-Eintrag zur Bestätigung.
2. Den bisherigen Eintrag für Vercel beim Domain-Anbieter ersetzen. Das Zertifikat holt Railway selbst, es kann ein paar Minuten dauern.
3. Supabase: `https://wortwinkel.xyz` steht schon in der Liste (bisherige Adresse), die Railway-Adresse kann bleiben.
4. Auf dem Handy die App neu öffnen. Die Push-Erlaubnis bleibt für dieselbe Adresse gültig, ein Neustart der App genügt meist.

## 5. Tägliche Zusammenfassung
Auf GitHub: Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `APP_URL` = `https://wortwinkel.xyz` (ohne Schrägstrich am Ende)
- `CRON_SECRET` = derselbe Wert wie oben

Danach unter **Actions → Tägliche Zusammenfassung → Run workflow** einmal von Hand starten; es sollte `{"sent":…}` ausgeben. Ab dann läuft es täglich um 17:00 UTC.

## 6. Aufräumen, wenn alles läuft
- Vercel-Projekt erst löschen, wenn mindestens ein Tag problemlos lief.
- `vercel.json` kann dann entfernt werden.
- Unter Railway **Observability** gelegentlich Speicher und Kosten ansehen.
