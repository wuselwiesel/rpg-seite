import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorldCover } from "@/components/world-cover";
import type { World } from "@/lib/types";
import { JoinOrRequestButton } from "../../join-or-request-button";
import { JoinWithInviteButton } from "./join-with-invite-button";
import { StaleLinkRequest } from "./stale-link-request";

export default async function JoinWorldPage({ params, searchParams }: PageProps<"/worlds/join/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" && /^[0-9a-f]{32}$/i.test(sp.t) ? sp.t.toLowerCase() : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextUrl = `/worlds/join/${id}${token ? `?t=${token}` : ""}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(nextUrl)}`);

  const { data: world } = await supabase.from("worlds").select("*").eq("id", id).maybeSingle<World>();
  if (!world) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-fg">Diese Welt gibt es nicht (mehr).</p>
        <Link href="/worlds" className="mt-3 inline-block text-sm text-accent hover:underline">
          Zu deinen Welten
        </Link>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("world_members")
    .select("world_id")
    .eq("world_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership) redirect(`/worlds/${id}`);

  const { data: pendingRequest } = await supabase
    .from("world_join_requests")
    .select("id")
    .eq("world_id", id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  // Gültiger Einladungs-Schlüssel: direkter Beitritt, egal welche Beitrittsart die Welt hat
  const { data: valid } = token ? await supabase.rpc("invite_valid", { p_world: id, p_token: token }) : { data: false };
  const invited = valid === true;
  const staleLink = !invited && world.join_mode === "invite";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <WorldCover name={world.name} coverUrl={world.cover_image_url} className="mb-5 h-28 w-28 text-2xl" />
      <p className="mb-1 text-sm text-muted">Du wurdest eingeladen</p>
      <h1 className="mb-2 font-serif text-3xl text-fg">{world.name}</h1>
      {world.description && <p className="mb-6 text-sm text-fg-soft">{world.description}</p>}
      {invited ? (
        <JoinWithInviteButton worldId={world.id} token={token!} />
      ) : staleLink ? (
        <StaleLinkRequest worldId={world.id} hasRequest={!!pendingRequest} />
      ) : (
        <JoinOrRequestButton worldId={world.id} joinMode={world.join_mode ?? "open"} hasRequest={!!pendingRequest} ownerId={world.created_by} />
      )}
      {world.preview && world.preview !== "none" && (
        <Link href={`/worlds/${world.id}/vorschau`} className="mt-4 text-sm text-accent hover:underline">
          Welt erkunden
        </Link>
      )}
    </div>
  );
}
