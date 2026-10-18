import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { buildEpub, loadBook } from "@/lib/story-book";

// E-Book (EPUB) mit allen Szenen der aktiven Welt
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });
  const world = await getActiveWorld(user.id);
  if (!world) return new NextResponse("Keine Welt gewählt.", { status: 404 });

  const book = await loadBook({ worldId: world.id });
  if (!book) return new NextResponse("Nicht gefunden.", { status: 404 });

  const file = book.title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Geschichte";
  const body = buildEpub(book, world.id);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${file}.epub"; filename*=UTF-8''${encodeURIComponent(file)}.epub`,
      "Cache-Control": "private, no-store",
    },
  });
}
