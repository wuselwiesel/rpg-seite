import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportAccount, exportFileName } from "@/lib/data-export";

// Alle eigenen Daten als JSON-Datei herunterladen.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

  try {
    const data = await exportAccount(user.id);
    const name = (data.konto as { username?: string } | null)?.username ?? "Konto";
    const file = exportFileName(`Wortwinkel_${name}_Daten`);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(file)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return new NextResponse(`Export fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannter Fehler"}`, { status: 500 });
  }
}
