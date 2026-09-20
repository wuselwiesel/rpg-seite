import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Erlaubt Dev-Zugriff über 127.0.0.1 (z. B. iOS-Simulator), sonst wird die Seite nicht hydriert.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Besuchte Seiten bleiben kurz im Client-Cache, damit Vor/Zurück und Tab-Wechsel
    // sofort reagieren (Mutationen invalidieren den Cache über revalidatePath).
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
