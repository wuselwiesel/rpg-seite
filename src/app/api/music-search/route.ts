import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Song-Suche für Storys: fragt die iTunes-Suche serverseitig ab (kein CORS-Problem im Browser)
// und liefert nur die 30-Sekunden-Vorschauen mit den nötigen Feldern zurück.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const term = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  if (!term) return NextResponse.json({ songs: [] });

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=12&country=DE`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { results: Record<string, string | number>[] };
    const songs = json.results
      .filter((r) => r.previewUrl)
      .map((r) => ({
        id: Number(r.trackId),
        name: String(r.trackName),
        artist: String(r.artistName),
        art: String(r.artworkUrl60 ?? ""),
        preview: String(r.previewUrl),
      }));
    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json({ error: "Suche nicht erreichbar." }, { status: 502 });
  }
}
