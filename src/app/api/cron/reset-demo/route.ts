import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Räumt die Übungswelt jede Nacht auf (siehe vercel.json): alles, was Übende angelegt haben, verschwindet,
// Beispielinhalt und Mitgliedschaften bleiben. Braucht CRON_SECRET (wie der Digest-Job).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Nicht erlaubt.", { status: 401 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await supabase.rpc("reset_demo_world", { p_secret: secret });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
