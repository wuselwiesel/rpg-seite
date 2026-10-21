import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectNotes } from "@/lib/notes-data";
import { noteDocument } from "@/lib/note-markdown";
import { noteTitle } from "@/lib/notes";
import { exportFileName } from "@/lib/data-export";

// Eigene Notizen als Markdown-Datei: ?id=… (eine Notiz) oder ?ordner=…&tag=…&welt=… (Auswahl)
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });
  const notes = await selectNotes(supabase, user.id, { id: p.get("id"), ids: p.get("ids")?.split(",") ?? null, folder: p.get("ordner"), tag: p.get("tag"), world: p.get("welt") });
  if (notes.length === 0) return new NextResponse("Keine Notizen.", { status: 404 });
  const body = notes.map((n) => noteDocument(n)).join("\n---\n\n");
  const file = exportFileName(notes.length === 1 ? noteTitle(notes[0]) : "Notizen", "md");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
