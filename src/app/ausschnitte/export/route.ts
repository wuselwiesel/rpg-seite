import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { collectionToText } from "@/lib/clips";
import { loadCollection } from "@/lib/clip-server";
import { exportFileName } from "@/lib/data-export";

// Eine Sammlung „Wichtige Momente“ als Textdatei (nur die eigene).
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("sammlung");
  if (!id) return new NextResponse("Sammlung fehlt.", { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });
  const collection = await loadCollection(supabase, id);
  if (!collection) return new NextResponse("Nicht gefunden.", { status: 404 });
  const file = exportFileName(`${collection.name}_${collection.characterName}`, "txt");
  return new NextResponse(collectionToText(collection.name, collection.characterName, collection.clips), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
