import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GifResult } from "@/lib/gif";

// GIF-Suche über Giphy (GIPHY_API_KEY) oder Tenor (TENOR_API_KEY). Ohne Schlüssel meldet die Route
// "configured: false", dann bietet die Oberfläche nur das Einfügen eines GIF-Links an.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ configured: false, results: [] }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const giphy = process.env.GIPHY_API_KEY;
  const tenor = process.env.TENOR_API_KEY;

  try {
    if (giphy) {
      const endpoint = q ? "search" : "trending";
      const url = `https://api.giphy.com/v1/gifs/${endpoint}?api_key=${encodeURIComponent(giphy)}&limit=24&rating=pg-13&lang=de${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const json = (await res.json()) as {
        data?: { id: string; title: string; images: Record<string, { url: string }> }[];
      };
      const results: GifResult[] = (json.data ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        url: g.images.downsized_medium?.url ?? g.images.original.url,
        preview: g.images.fixed_width_small?.url ?? g.images.fixed_width?.url ?? g.images.original.url,
      }));
      return NextResponse.json({ configured: true, results });
    }
    if (tenor) {
      const endpoint = q ? "search" : "featured";
      const url = `https://tenor.googleapis.com/v2/${endpoint}?key=${encodeURIComponent(tenor)}&client_key=wortwinkel&limit=24&media_filter=gif,tinygif&locale=de_DE&contentfilter=medium${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const json = (await res.json()) as {
        results?: { id: string; content_description: string; media_formats: Record<string, { url: string }> }[];
      };
      const results: GifResult[] = (json.results ?? []).map((g) => ({
        id: g.id,
        title: g.content_description,
        url: g.media_formats.gif?.url,
        preview: g.media_formats.tinygif?.url ?? g.media_formats.gif?.url,
      }));
      return NextResponse.json({ configured: true, results: results.filter((r) => r.url) });
    }
  } catch {
    return NextResponse.json({ configured: true, results: [], error: "GIF-Dienst nicht erreichbar." });
  }
  return NextResponse.json({ configured: false, results: [] });
}
