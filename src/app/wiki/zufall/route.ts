import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { appUrl } from "@/lib/app-url";

// Zufällige Wiki-Seite der aktiven Welt (Entwürfe anderer sieht die Datenbank ohnehin nicht).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl(request, "/login"));
  const world = await getActiveWorld(user.id);
  if (!world) return NextResponse.redirect(appUrl(request, "/worlds"));

  const { data } = await supabase.from("wiki_pages").select("id").eq("world_id", world.id).eq("is_draft", false);
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length === 0) return NextResponse.redirect(appUrl(request, "/wiki"));
  const pick = ids[Math.floor(Math.random() * ids.length)];
  const res = NextResponse.redirect(appUrl(request, `/wiki/${pick}`));
  res.headers.set("Cache-Control", "no-store");
  return res;
}
