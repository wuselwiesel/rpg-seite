import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Kürzerer Herzschlag: tote Verbindungen (Handy, Netzwechsel) fallen nach ~20 s statt ~50 s auf, danach verbindet sich Realtime neu
    { realtime: { heartbeatIntervalMs: 10_000 } },
  );
}
