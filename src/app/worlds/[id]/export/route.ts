import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportFileName, exportWorld } from "@/lib/data-export";

// Eine Welt als JSON-Datei sichern (für Mitglieder der Welt).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

  const { data: member } = await supabase.from("world_members").select("user_id").eq("world_id", id).eq("user_id", user.id).maybeSingle();
  if (!member) return new NextResponse("Nur für Mitglieder der Welt.", { status: 403 });

  try {
    const data = await exportWorld(id);
    if (!data) return new NextResponse("Nicht gefunden.", { status: 404 });
    const file = exportFileName(`${String((data.welt as { name?: string }).name ?? "Welt")}_Sicherung`);
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
