import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Tägliche Zusammenfassung: wird von Vercel Cron aufgerufen (siehe vercel.json). Braucht die
// Umgebungsvariable CRON_SECRET (in Vercel gesetzt, gleicher Wert wie in der Tabelle app_secrets).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Nicht erlaubt.", { status: 401 });
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return NextResponse.json({ sent: 0, note: "Push nicht konfiguriert." });
  webpush.setVapidDetails("mailto:chronik@example.com", publicKey, privateKey);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.rpc("digest_due", { p_secret: secret });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as { user_id: string; unread_count: number; endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify({
            title: "Wortwinkel",
            body: r.unread_count === 1 ? "Du hast 1 ungelesene Benachrichtigung." : `Du hast ${r.unread_count} ungelesene Benachrichtigungen.`,
            url: "/",
          }),
        );
        sent++;
      } catch {
        /* veraltetes Abo: wird beim nächsten normalen Push aufgeräumt */
      }
    }),
  );
  return NextResponse.json({ sent });
}
