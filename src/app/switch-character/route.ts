import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, ACTIVE_WORLD_COOKIE, SELECTION_COOKIE_OPTIONS } from "@/lib/types";
import { LAST_CHARACTERS_COOKIE, rememberLastCharacter } from "@/lib/last-characters";
import { appUrl } from "@/lib/app-url";

// Wechselt zum angegebenen (eigenen) Charakter und dessen Welt und leitet dann
// weiter - z.B. aus einer Chat-Benachrichtigung heraus, damit der Chat des
// angeschriebenen Charakters direkt geöffnet werden kann.
export async function GET(request: NextRequest) {
  const characterId = request.nextUrl.searchParams.get("character") ?? "";
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl(request, "/login"));

  const { data: character } = await supabase
    .from("characters")
    .select("id, world_id")
    .eq("id", characterId)
    .eq("owner_id", user.id)
    .eq("is_npc", false)
    .eq("vacant", false)
    .is("deleted_at", null)
    .maybeSingle();

  const response = NextResponse.redirect(appUrl(request, target));
  if (character) {
    const cookieOptions = SELECTION_COOKIE_OPTIONS;
    response.cookies.set(ACTIVE_CHARACTER_COOKIE, character.id, cookieOptions);
    response.cookies.set(ACTIVE_WORLD_COOKIE, character.world_id, cookieOptions);
    response.cookies.set(LAST_CHARACTERS_COOKIE, rememberLastCharacter(request.cookies.get(LAST_CHARACTERS_COOKIE)?.value, character.world_id, character.id), cookieOptions);
  }
  return response;
}
