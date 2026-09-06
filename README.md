# Chronik – Textbasiertes RPG für Freunde

Eine kleine Web-App zum gemeinsamen Rollenspielen: Story-Posts wie ein Blog (mit Kommentaren) plus Chats in Echtzeit (1:1 und Gruppen), jeweils mit eigenen Charakteren.

## Setup

### 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) kostenlos ein Konto erstellen und ein neues Projekt anlegen.
2. Im Projekt-Dashboard unter **SQL Editor** eine neue Query öffnen, den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen. Das legt alle Tabellen, Sicherheitsregeln (Row Level Security) und die Realtime-Freigabe für den Chat an.
3. Unter **Authentication → Sign In / Providers**: E-Mail-Login ist standardmäßig aktiv. Optional unter **Authentication → Sign In / Providers → Email** die Option "Confirm email" deaktivieren, damit sich Freunde ohne Mail-Bestätigung direkt einloggen können (praktisch für eine kleine private Gruppe).
4. Unter **Project Settings → Data API** die **Project URL** und den **anon public key** kopieren.

### 2. Lokal einrichten

```bash
cp .env.example .env.local
```

In `.env.local` die beiden Werte aus Schritt 1.4 eintragen:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Dann:

```bash
npm install
npm run dev
```

Die Seite läuft unter `http://localhost:3000`.

### 3. Online stellen (kostenlos via Vercel)

1. Repo auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) einloggen, "New Project" → das Repo auswählen.
3. Bei den Environment Variables dieselben zwei Werte (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) eintragen.
4. Deployen. Danach ist die Seite über die Vercel-URL erreichbar – Link an die Freunde schicken.

## Funktionen

- **Charaktere**: Jede Person kann mehrere Charaktere anlegen und oben rechts umschalten. Alles, was man postet, kommentiert oder schreibt, ist dem gerade aktiven Charakter zugeordnet.
- **Feed** (`/`): Story-Einträge aller Charaktere, chronologisch, mit Kommentaren darunter.
- **Chats** (`/chats`): 1:1- und Gruppenchats zwischen Charakteren, Nachrichten erscheinen live (Supabase Realtime) ohne Neuladen.

## Technik

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres-Datenbank, Auth (E-Mail/Passwort) und Realtime für den Chat
- Zugriffsrechte laufen komplett über Row Level Security in Postgres (siehe `supabase/schema.sql`)
