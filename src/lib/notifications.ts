import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseMentions } from "@/lib/mentions";
import { sendPushToUser } from "@/lib/push";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Legt eine In-App-Benachrichtigung an und schickt - falls die Zielperson ein
// Push-Abo hat - direkt danach auch eine echte Browser-Push-Benachrichtigung.
// Zentraler Ort für beides, damit neue Benachrichtigungs-Typen nicht beides
// separat verdrahten müssen.
export async function createNotification(
  supabase: SupabaseServerClient,
  params: {
    userId: string;
    type: string;
    actorName: string;
    actorAvatarUrl: string | null;
    link: string;
    message: string;
    // Charakter der Empfänger:in, für den die Benachrichtigung gedacht ist.
    recipientName?: string | null;
  },
) {
  await supabase.rpc("create_notification", {
    p_user_id: params.userId,
    p_type: params.type,
    p_actor_name: params.actorName,
    p_actor_avatar_url: params.actorAvatarUrl,
    p_link: params.link,
    p_message: params.message,
    p_recipient_name: params.recipientName ?? null,
  });

  await sendPushToUser(params.userId, {
    title: params.actorName,
    body: params.recipientName ? `${params.recipientName}: ${params.message}` : params.message,
    url: params.link,
  }, { recipientName: params.recipientName });
}

export type AppNotification = {
  id: string;
  type: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
  link: string;
  message: string;
  recipient_name?: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getRecentNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<AppNotification[]>();

  return data ?? [];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return count ?? 0;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

// Benachrichtigt alle per @-Erwähnung markierten Charaktere (außer der
// schreibenden Person selbst) über einen neuen Kommentar/Story-Eintrag.
export async function notifyMentionedCharacterIds(
  mentionedCharacterIds: string[],
  actorUserId: string,
  actorCharacterId: string,
  link: string,
  message: string,
  // Erzähler:in-Beitrag: ohne Namen und Bild des schreibenden Charakters.
  neutralActor = false,
) {
  if (mentionedCharacterIds.length === 0) return;

  const supabase = await createClient();

  const [{ data: owners }, { data: actor }] = await Promise.all([
    supabase.from("characters").select("id, owner_id, name").in("id", mentionedCharacterIds),
    supabase.from("characters").select("name, avatar_url").eq("id", actorCharacterId).maybeSingle(),
  ]);

  const targetUserIds = Array.from(
    new Set((owners ?? []).map((o) => o.owner_id).filter((id) => id !== actorUserId)),
  );
  if (targetUserIds.length === 0) return;

  await Promise.all(
    targetUserIds.map((targetUserId) =>
      createNotification(supabase, {
        userId: targetUserId,
        type: "mention",
        actorName: neutralActor ? "Erzähler:in" : (actor?.name ?? "Jemand"),
        actorAvatarUrl: neutralActor ? null : (actor?.avatar_url ?? null),
        link,
        message,
        recipientName: (owners ?? [])
          .filter((o) => o.owner_id === targetUserId)
          .map((o) => o.name)
          .join(", "),
      }),
    ),
  );
}

// Für Plain-Text-Inhalte mit der alten @[Name](id)-Kodierung (Feed-Posts/Kommentare).
export async function notifyMentionedCharacters(
  content: string,
  actorUserId: string,
  actorCharacterId: string,
  link: string,
  message: string,
) {
  const mentionedCharacterIds = Array.from(
    new Set(
      parseMentions(content)
        .filter((s) => s.type === "mention")
        .map((s) => (s as Extract<typeof s, { type: "mention" }>).characterId),
    ),
  );
  return notifyMentionedCharacterIds(mentionedCharacterIds, actorUserId, actorCharacterId, link, message);
}
