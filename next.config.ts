import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Eigenständiger Server für Docker (Coolify/VPS); bei Vercel ohne Wirkung
  output: "standalone",
  // Kennung der Version, die im Browser läuft (zum Erkennen veralteter offener Seiten)
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.SOURCE_COMMIT ?? "dev" },
  // Erlaubt Dev-Zugriff über 127.0.0.1 (z. B. iOS-Simulator), sonst wird die Seite nicht hydriert.
  allowedDevOrigins: ["127.0.0.1"],
  // Auch als Antwort-Kopfzeile (gilt für jede Seite, Bilder und Dateien): nicht indexieren, nicht folgen
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }] }];
  },
  // @react-pdf/renderer nicht ins Server-Bundle einbetten (standalone-Modus kopiert es als externen Import)
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Dynamische Seiten nicht im Client-Cache halten: sonst zeigte ein Seitenwechsel kurz nach Weltwechsel oder Speichern
    // noch den alten Stand (Feed der vorherigen Welt, alte Wiki-Startseite). Statische Teile dürfen bleiben.
    staleTimes: { dynamic: 0, static: 180 },
  },
};

export default nextConfig;
