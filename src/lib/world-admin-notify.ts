import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { WORLD_ADMIN_EVENTS, type WorldAdminEvent } from "@/lib/world-admin-events";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Sagt Besitzer:in und Admins einer Welt Bescheid (außer der auslösenden Person und wer das Ereignis ausgeschaltet hat).
// Ein Fehler hier darf die eigentliche Aktion nie verhindern.
export async function notifyWorldAdmins(
  supabase: Supabase,
  worldId: string,
  event: WorldAdminEvent,
  actorUserId: string,
  message: string,
  link?: string,
): Promise<void> {
  try {
    const def = WORLD_ADMIN_EVENTS.find((e) => e.key === event);
    if (!def) return;
    const { data: recipients } = await supabase.rpc("world_admin_recipients", { p_world: worldId, p_event: event });
    const ids = (Array.isArray(recipients) ? recipients : []).filter((id): id is string => typeof id === "string");
    if (ids.length === 0) return;
    const { data: profile } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", actorUserId).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
    const { data: world } = await supabase.from("worlds").select("name").eq("id", worldId).maybeSingle<{ name: string }>();
    const where = world?.name ? ` (${world.name})` : "";
    await Promise.all(
      ids.map((userId) =>
        createNotification(supabase, {
          userId,
          type: def.type,
          actorName: profile?.nickname || profile?.username || "Jemand",
          actorAvatarUrl: profile?.avatar_url ?? null,
          link: link ?? `/worlds/${worldId}`,
          message: `${message}${where}`,
        }),
      ),
    );
  } catch {
    // Meldungen sind nachrangig.
  }
}

// „Eintrag voll“: je Eintrag, der durch die Änderung seine Höchstzahl erreicht hat, eine Meldung
export async function notifyFullEntries(
  supabase: Supabase,
  worldId: string,
  actorUserId: string,
  entries: { list: string; entry: string; max: number }[],
): Promise<void> {
  for (const e of entries) {
    await notifyWorldAdmins(supabase, worldId, "entry_full", actorUserId, `hat den letzten freien Platz für „${e.entry}“ (${e.list}) vergeben: ${e.max}/${e.max}`, `/worlds/${worldId}/listen`);
  }
}
