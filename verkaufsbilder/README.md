# Verkaufsbild Studio

Eigenständige Web-App (reines HTML, CSS und JavaScript, kein Build). Sie macht aus Fotos Verkaufsbilder und speichert sie als PNG.

## Funktionen

- **Stile:** Tise (Foto mit Verlauf), Karte, Bogen, Polaroid, Magazin
- **Collagen:** ein bis vier Fotos (nebeneinander, untereinander, drei, vier). Jedes Foto hat eigenen Zoom, Ausschnitt und eigene Korrektur.
- **Formate:** 4:5, 1:1 und Story (9:16, mit freiem Rand für die Oberfläche der Apps)
- **Aufkleber:** Preis (kommt aus dem Preisfeld), NEU, SALE, Neuwertig, Reserviert, Verkauft, Versand inklusive und mehr, dazu Emojis. Frei verschieben, drehen, vergrößern, Farbe und Form wählen.
- **Foto verbessern:** Helligkeit, Kontrast, Farbe und „Automatisch verbessern“
- **Farben:** Paletten, eigene Farben und „Passend zum Foto“
- **Artikelart:** Kleidung, Schuhe, Taschen, Kinder, Bücher, Technik, Möbel, Spielzeug, Sonstiges. Die Felder, Schnellwahl (Größen, Zustand) und passende Aufkleber ändern sich mit der Art. Bei Schuhen und Kindergrößen steht „Gr. 38“, bei Büchern der Autor.
- **Text:** sechs Schriften, Shop-Name im Foto
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

## Veröffentlichen (GitHub Pages)

Die Datei `.github/workflows/verkaufsbilder-pages.yml` veröffentlicht den Ordner bei jeder Änderung auf `main` automatisch. Einmalig nötig:

1. Änderungen auf `main` bringen (Pull Request zusammenführen).
2. Auf GitHub im Repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
3. Unter dem Reiter **Actions** den Lauf „Verkaufsbild Studio veröffentlichen“ abwarten (oder dort von Hand starten).

Die Seite liegt danach unter `https://wuselwiesel.github.io/rpg-seite/`. Sie braucht HTTPS (bei GitHub Pages gegeben), damit die Installation als App und der Offline-Modus funktionieren.

Alternativ lässt sich der Ordner bei Netlify, Cloudflare Pages oder Vercel als statische Seite hochladen (Wurzelverzeichnis: `verkaufsbilder`).
