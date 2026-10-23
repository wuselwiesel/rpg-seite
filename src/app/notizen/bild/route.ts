import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bild einer Notiz anzeigen: nur eigene Dateien (Pfad beginnt mit der Konto-ID), signierte URL gilt eine Stunde.
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("p") ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return new NextResponse("Nicht gefunden.", { status: 404 });
  const { data, error } = await supabase.storage.from("note-files").createSignedUrl(path, 3600);
  if (error || !data) return new NextResponse("Nicht gefunden.", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=3500" } });
}
