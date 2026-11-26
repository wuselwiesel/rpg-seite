# Verkaufsbild Studio

Eigenständige Web-App (reines HTML, CSS und JavaScript, kein Build). Sie macht aus einem Foto ein Verkaufsbild im Tise-Stil und speichert es als PNG (1080 × 1350).

- Läuft ohne Server-Code, als installierbare App (PWA) und nach dem ersten Laden auch offline.
- Hat nichts mit der Next.js-Seite im Hauptverzeichnis zu tun und braucht keinen Login.
- Fotos bleiben im Browser. Gemerkt werden nur Schrift, Farben und Texte (localStorage).

## Lokal starten

    cd verkaufsbilder
    python3 -m http.server 8080

Dann http://localhost:8080 öffnen.

## Veröffentlichen

Den Ordner `verkaufsbilder/` als statische Seite hochladen, zum Beispiel bei Vercel, Netlify, Cloudflare Pages oder GitHub Pages (Wurzelverzeichnis: `verkaufsbilder`). Die Seite braucht HTTPS, damit die Installation als App und der Offline-Modus funktionieren.
