import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEpub, loadBook } from "@/lib/story-book";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

  const book = await loadBook({ sceneId: id });
  if (!book) return new NextResponse("Nicht gefunden.", { status: 404 });

  const file = book.title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Geschichte";
  const body = buildEpub(book, id);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${file}.epub"; filename*=UTF-8''${encodeURIComponent(file)}.epub`,
      "Cache-Control": "private, no-store",
    },
  });
}
