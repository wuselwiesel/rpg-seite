import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadBook } from "@/lib/story-book";
import { buildBookPdf } from "@/lib/story-pdf";

export const dynamic = "force-dynamic";

// Szene als PDF-Datei zum Herunterladen (der Browser-Druckdialog taugt am Handy nicht)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

    const book = await loadBook({ sceneId: id });
    if (!book) return new NextResponse("Nicht gefunden.", { status: 404 });

    const buffer = await buildBookPdf(book);
    const file = book.title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Geschichte";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file}.pdf"; filename*=UTF-8''${encodeURIComponent(file)}.pdf`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[pdf/route]", err);
    return new NextResponse(`PDF-Fehler: ${String(err)}`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
