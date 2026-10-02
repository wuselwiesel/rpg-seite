import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";

// Zufällige Wiki-Seite der aktiven Welt (Entwürfe anderer sieht die Datenbank ohnehin nicht).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const world = await getActiveWorld(user.id);
  if (!world) return NextResponse.redirect(new URL("/worlds", request.url));

  const { data } = await supabase.from("wiki_pages").select("id").eq("world_id", world.id).eq("is_draft", false);
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length === 0) return NextResponse.redirect(new URL("/wiki", request.url));
  const pick = ids[Math.floor(Math.random() * ids.length)];
  const res = NextResponse.redirect(new URL(`/wiki/${pick}`, request.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}
