import "server-only";
import { createClient } from "@/lib/supabase/server";
import { castStatus, type CastRole, type CastStatus } from "@/lib/cast";
import { getWorldAdminIds } from "@/lib/npc-data";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CastRow = CastRole & {
  status: CastStatus;
  character: { id: string; name: string; avatarUrl: string | null; ownerName: string | null; vacant: boolean } | null;
  // Name der Person, für die reserviert bzw. zugesagt ist
  holderName: string | null;
  holderIsMe: boolean;
  myRequestId: string | null;
  // Offene Anfragen (nur für Admins vollständig; andere sehen nur ihre eigene)
  requests: { id: string; userId: string; userName: string; message: string | null }[];
};

export type CastData = {
  enabled: boolean;
  isAdmin: boolean;
  rows: CastRow[];
  members: { id: string; name: string }[];
  // Eigene Charaktere der Welt (zum Verknüpfen) und alle Charaktere für Admins
  characters: { id: string; name: string; ownerName: string | null }[];
};

const ROLE_COLUMNS = "id, name, age_text, species_text, source, description, deceased, state, holder_user, holder_label, holder_kind, holder_until, character_id";

export async function loadCast(supabase: Supabase, worldId: string, userId: string): Promise<CastData> {
  const [{ data: world }, adminIds] = await Promise.all([
    supabase.from("worlds").select("cast_enabled").eq("id", worldId).maybeSingle<{ cast_enabled: boolean | null }>(),
    getWorldAdminIds(worldId),
  ]);
  const isAdmin = adminIds.includes(userId);
  const enabled = Boolean(world?.cast_enabled);
  if (!enabled && !isAdmin) return { enabled, isAdmin, rows: [], members: [], characters: [] };

  const [{ data: roles }, { data: requests }, { data: memberRows }, { data: chars }] = await Promise.all([
    supabase.from("world_roles").select(ROLE_COLUMNS).eq("world_id", worldId).order("name").limit(3000).returns<CastRole[]>(),
    supabase
      .from("world_role_requests")
      .select("id, role_id, user_id, message")
      .eq("world_id", worldId)
      .eq("status", "pending")
      .returns<{ id: string; role_id: string; user_id: string; message: string | null }[]>(),
    supabase.from("world_members").select("user_id, profiles(username, nickname)").eq("world_id", worldId).returns<{ user_id: string; profiles: { username: string; nickname: string | null } | null }[]>(),
    supabase
      .from("characters")
      .select("id, name, avatar_url, owner_id, vacant, deleted_at")
      .eq("world_id", worldId)
      .eq("is_npc", false)
      .is("deleted_at", null)
      .order("name")
      .limit(2000)
      .returns<{ id: string; name: string; avatar_url: string | null; owner_id: string; vacant: boolean; deleted_at: string | null }[]>(),
  ]);

  const memberName = new Map((memberRows ?? []).map((m) => [m.user_id, m.profiles?.nickname || m.profiles?.username || "?"]));
  const charById = new Map((chars ?? []).map((c) => [c.id, c]));
  const reqsByRole = new Map<string, CastRow["requests"]>();
  for (const q of requests ?? []) {
    const list = reqsByRole.get(q.role_id) ?? [];
    list.push({ id: q.id, userId: q.user_id, userName: memberName.get(q.user_id) ?? "?", message: q.message });
    reqsByRole.set(q.role_id, list);
  }

  const now = new Date();
  const rows: CastRow[] = (roles ?? []).map((r) => {
    const c = r.character_id ? charById.get(r.character_id) ?? null : null;
    const status = castStatus(r, r.character_id ? { deleted: !c, vacant: Boolean(c?.vacant) } : null, now);
    const reqs = reqsByRole.get(r.id) ?? [];
    return {
      ...r,
      status,
      character: c ? { id: c.id, name: c.name, avatarUrl: c.avatar_url, ownerName: memberName.get(c.owner_id) ?? null, vacant: c.vacant } : null,
      holderName: r.holder_user ? memberName.get(r.holder_user) ?? null : r.holder_label,
      holderIsMe: r.holder_user === userId,
      myRequestId: reqs.find((q) => q.userId === userId)?.id ?? null,
      requests: isAdmin ? reqs : [],
    };
  });

  return {
    enabled,
    isAdmin,
    rows,
    members: [...memberName.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    characters: (chars ?? []).filter((c) => isAdmin || c.owner_id === userId).map((c) => ({ id: c.id, name: c.name, ownerName: memberName.get(c.owner_id) ?? null })),
  };
}
