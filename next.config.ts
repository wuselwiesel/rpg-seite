import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Kennung der Version, die im Browser läuft (zum Erkennen veralteter offener Seiten)
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  // Erlaubt Dev-Zugriff über 127.0.0.1 (z. B. iOS-Simulator), sonst wird die Seite nicht hydriert.
  allowedDevOrigins: ["127.0.0.1"],
  // Auch als Antwort-Kopfzeile (gilt für jede Seite, Bilder und Dateien): nicht indexieren, nicht folgen
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }] }];
  },
  experimental: {
    // Besuchte Seiten bleiben kurz im Client-Cache, damit Vor/Zurück und Tab-Wechsel
    // sofort reagieren (Mutationen invalidieren den Cache über revalidatePath).
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
