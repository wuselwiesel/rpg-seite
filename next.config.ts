import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Besuchte Seiten bleiben kurz im Client-Cache, damit Vor/Zurück und Tab-Wechsel
    // sofort reagieren (Mutationen invalidieren den Cache über revalidatePath).
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
