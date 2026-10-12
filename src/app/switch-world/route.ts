import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { worldOfLink } from "@/lib/link-world";
import { ACTIVE_CHARACTER_COOKIE, ACTIVE_WORLD_COOKIE, SELECTION_COOKIE_OPTIONS } from "@/lib/types";

// Wechselt zur Welt, zu der der Link gehört (z. B. aus einer Benachrichtigung), und leitet dann weiter.
// Ohne Mitgliedschaft in dieser Welt bleibt die aktive Welt unverändert.
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(target)}`, request.url));

  const requested = request.nextUrl.searchParams.get("world");
  const worldId = requested && /^[0-9a-f-]{36}$/.test(requested) ? requested : await worldOfLink(supabase, target);

  const response = NextResponse.redirect(new URL(target, request.url));
  if (!worldId) return response;

  const { data: membership } = await supabase.from("world_members").select("world_id").eq("world_id", worldId).eq("user_id", user.id).maybeSingle();
  if (!membership) return response;

  const active = await getActiveWorld(user.id);
  if (active?.id !== worldId) {
    response.cookies.set(ACTIVE_WORLD_COOKIE, worldId, SELECTION_COOKIE_OPTIONS);
    response.cookies.delete(ACTIVE_CHARACTER_COOKIE);
  }
  return response;
}
