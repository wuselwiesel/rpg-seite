import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Einfache serverseitige Rate-Begrenzung direkt über die bestehende Tabelle: zählt, wie
// oft die Nutzerin/der Nutzer die Aktion im Zeitfenster schon ausgeführt hat. Keine
// zusätzliche Infrastruktur (Redis o.ä.) nötig - reicht als Schutz gegen Bugs/Skript-Spam
// in einer kleinen Freundesrunde, nicht als Schutz gegen gezielte Angriffe.
export async function isRateLimited(
  supabase: SupabaseClient,
  table: string,
  userColumn: string,
  userId: string,
  windowSeconds: number,
  maxCount: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(userColumn, userId)
    .gte("created_at", since);
  return (count ?? 0) >= maxCount;
}
