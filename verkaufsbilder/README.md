# Verkaufsbild Studio

Eigenständige Web-App (reines HTML, CSS und JavaScript, kein Build). Sie macht aus Fotos Verkaufsbilder und speichert sie als PNG.

## Funktionen

- **Stile:** Tise (Foto mit Verlauf), Karte, Bogen, Polaroid, Magazin
- **Collagen:** ein bis vier Fotos (nebeneinander, untereinander, drei, vier). Jedes Foto hat eigenen Zoom, Ausschnitt und eigene Korrektur.
- **Formate:** 4:5, 1:1 und Story (9:16, mit freiem Rand für die Oberfläche der Apps)
- **Aufkleber:** Preis (kommt aus dem Preisfeld), NEU, SALE, Neuwertig, Reserviert, Verkauft, Versand inklusive und mehr, dazu Emojis. Frei verschieben, drehen, vergrößern, Farbe und Form wählen.
- **Foto verbessern:** Helligkeit, Kontrast, Farbe und „Automatisch verbessern“
- **Farben:** Paletten, eigene Farben und „Passend zum Foto“
- **Text:** sechs Schriften, Größen- und Zustands-Schnellwahl, Shop-Name im Foto
- Foto im Bild ziehen oder mit zwei Fingern zoomen. Aufkleber ziehen. Auf ein leeres Feld tippen, um ein Foto zu laden.
- Läuft als installierbare App (PWA) und nach dem ersten Laden auch offline. Auf dem Handy gibt es „Teilen“.
- Fotos bleiben im Browser. Gemerkt werden nur Stil, Farben, Texte und Aufkleber (localStorage).

Hat nichts mit der Next.js-Seite im Hauptverzeichnis zu tun und braucht keinen Login.

## Dateien

- `core.js` Zustand und Konstanten (Stile, Farben, Aufkleber-Vorlagen)
- `render.js` Zeichnen auf dem Canvas
- `ui.js` Bedienung
- `sw.js`, `manifest.webmanifest` App-Installation und Offline-Betrieb

## Lokal starten

    cd verkaufsbilder
    python3 -m http.server 8080

Dann http://localhost:8080 öffnen.

## Veröffentlichen

Den Ordner `verkaufsbilder/` als statische Seite hochladen, zum Beispiel bei Vercel, Netlify, Cloudflare Pages oder GitHub Pages (Wurzelverzeichnis: `verkaufsbilder`). Die Seite braucht HTTPS, damit die Installation als App und der Offline-Modus funktionieren.
