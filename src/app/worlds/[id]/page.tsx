import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getOfficialAccountId } from "@/lib/account-marks";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedFriends } from "@/lib/friends";
import { WorldCover, isIconCover } from "@/components/world-cover";
import { EnterWorldButton } from "../enter-world-button";
import { JoinOrRequestButton } from "../join-or-request-button";
import { JoinRequests, type JoinRequest } from "./join-requests";
import { LeaveWorldButton } from "./leave-world-button";
import { InviteFriendForm } from "./invite-friend-form";
import { InviteLink } from "@/components/invite-link";
import { MemberActions } from "./member-actions";
import { sanitizePostHtml } from "@/lib/sanitize";
import { getActiveWorld } from "@/lib/worlds";
import { WorldAdminTabs } from "@/components/world-admin-tabs";
import { AdminHint } from "@/components/admin-hint";
import { CharacterAvatar } from "@/components/character-avatar";
import { RolesPanel } from "./roles-panel";
import { FriendButton } from "@/components/friend-button";
import { myFriendships } from "@/lib/welcome-data";
import { getWorldRoles } from "@/lib/character-claims-data";
import type { Profile, World } from "@/lib/types";

// Bis zu drei Charakterbilder des Mitglieds, jedes führt zum Profil; ohne Charakter ein neutraler Kreis
function MemberFigures({ figures, fallbackName }: { figures: { id: string; name: string; avatar_url: string | null }[]; fallbackName: string }) {
  if (figures.length === 0) {
    return (
      <span className="mr-3">
        <CharacterAvatar name={fallbackName} avatarUrl={null} size={32} />
      </span>
    );
  }
  return (
    <span className="mr-3 flex -space-x-2">
      {figures.slice(0, 3).map((c) => (
        <Link key={c.id} href={`/characters/${c.id}`} title={c.name} aria-label={c.name} className="rounded-full ring-2 ring-surface">
          <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={32} />
        </Link>
      ))}
    </span>
  );
}

type WorldMemberRow = { user_id: string; role: "member" | "admin"; profiles: Profile };

export default async function WorldDetailPage({ params }: PageProps<"/worlds/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: world } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", id)
    .maybeSingle<World>();

  if (!world) notFound();

  const { data: members } = await supabase
    .from("world_members")
    .select("user_id, role, profiles(*)")
    .eq("world_id", id)
    .returns<WorldMemberRow[]>();

  const isOwner = world.created_by === user.id;
  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  const isMember = memberIds.has(user.id);
  const isAdmin = isOwner || (members ?? []).some((m) => m.user_id === user.id && m.role === "admin");

  // Offene Beitrittsanfragen (nur für Admins sichtbar) bzw. die eigene Anfrage
  const { data: requestRows } = await supabase
    .from("world_join_requests")
    .select("id, user_id, message, created_at, character_id, role:characters!world_join_requests_character_id_fkey(id, name), profiles!world_join_requests_user_id_fkey(username, nickname)")
    .eq("world_id", id)
    .eq("status", "pending")
    .order("created_at")
    .returns<(Omit<JoinRequest, "name" | "role"> & { character_id: string | null; role: { id: string; name: string } | null; profiles: { username: string; nickname: string | null } | null })[]>();
  const requests: JoinRequest[] = (requestRows ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    message: r.message,
    created_at: r.created_at,
    name: r.profiles?.nickname || r.profiles?.username || "Unbekannt",
    role: r.role,
  }));
  const myRequest = (requestRows ?? []).some((r) => r.user_id === user.id);

  // Aktive Welt (dann heißt der Hauptknopf „Zum Feed“) und die Charaktere der Mitglieder für die Liste
  const activeWorld = isMember ? await getActiveWorld(user.id) : null;
  const inThisWorld = activeWorld?.id === world.id;
  const { data: memberCharacters } = isMember
    ? await supabase
        .from("characters")
        .select("id, owner_id, name, avatar_url")
        .eq("world_id", id)
        .eq("is_npc", false)
        .is("deleted_at", null)
        .order("name")
        .returns<{ id: string; owner_id: string; name: string; avatar_url: string | null }[]>()
    : { data: [] as { id: string; owner_id: string; name: string; avatar_url: string | null }[] };
  const { count: characterCount } = isMember
    ? await supabase.from("characters").select("id", { count: "exact", head: true }).eq("world_id", id).is("deleted_at", null)
    : { count: 0 };
  const { count: reviewCount } = isAdmin
    ? await supabase.from("characters").select("id", { count: "exact", head: true }).eq("world_id", id).eq("review_status", "pending").is("deleted_at", null)
    : { count: 0 };
  const charactersByOwner = new Map<string, { id: string; name: string; avatar_url: string | null }[]>();
  for (const c of memberCharacters ?? []) {
    const list = charactersByOwner.get(c.owner_id) ?? [];
    list.push(c);
    charactersByOwner.set(c.owner_id, list);
  }

  // Freie Rollen, Rollenanfragen (Admins) und Angebote an mich
  const memberNames = new Map((members ?? []).map((m) => [m.user_id, m.profiles.nickname || m.profiles.username]));
  const { roles, offersForMe } = isMember ? await getWorldRoles(id, user.id, memberNames) : { roles: [], offersForMe: [] };

  const friendStatus = isMember ? await myFriendships(user.id) : new Map();

  const officialId = isAdmin ? await getOfficialAccountId() : null;
  const friends = isAdmin ? (await getAcceptedFriends(user.id)).filter((f) => f.id !== officialId) : [];
  const invitableFriends = friends.filter((f) => !memberIds.has(f.id));

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      {isAdmin && <WorldAdminTabs worldId={world.id} />}
      {isAdmin && <AdminHint worldId={world.id} />}
      {world.cover_image_url ? (
        // Das Bild bleibt in seinem Format (quadratisch, 4:3, breit), nur in der Höhe begrenzt
        // eslint-disable-next-line @next/next/no-img-element
        <img src={world.cover_image_url} alt={world.name} className={`mb-6 h-auto w-auto max-w-full rounded-xl ${isIconCover(world.cover_image_url) ? "max-h-40" : "max-h-80 bg-surface-2"}`} />
      ) : (
        <WorldCover name={world.name} coverUrl={null} className="mb-6 h-40 w-full" />
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-fg">{world.name}</h1>
          {world.is_demo && <p className="mt-1 text-xs font-medium text-accent">Übungswelt</p>}
          {world.description && <p className="mt-1 text-sm text-muted">{world.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMember ? (
            inThisWorld ? (
              <Link href="/" className="shrink-0 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
                Zum Feed
              </Link>
            ) : (
              <EnterWorldButton worldId={world.id} primary />
            )
          ) : (
            <JoinOrRequestButton worldId={world.id} joinMode={world.join_mode ?? "open"} hasRequest={myRequest} ownerId={world.created_by} />
          )}
          {!isMember && world.preview && world.preview !== "none" && (
            <Link
              href={`/worlds/${world.id}/vorschau`}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
            >
              Erkunden
            </Link>
          )}
        </div>
      </div>

      {world.welcome_html && sanitizePostHtml(world.welcome_html).replace(/<[^>]*>/g, "").trim() && (
        <section aria-label="Willkommen" className="mb-8 rounded-2xl border border-line bg-surface p-5">
          <div className="post-content text-[15.5px] leading-[1.75] text-fg" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(world.welcome_html) }} />
        </section>
      )}

      {isMember && (
        <RolesPanel
          isAdmin={isAdmin}
          roles={roles}
          offersForMe={offersForMe}
          members={(members ?? []).map((m) => ({ id: m.user_id, name: m.profiles.nickname || m.profiles.username }))}
        />
      )}

      {isAdmin && requests.length > 0 && <JoinRequests worldId={world.id} requests={requests} />}

      {isMember && (
        <Link
          href={`/worlds/${world.id}/charaktere`}
          className="mb-8 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-fg transition hover:border-accent"
        >
          <span className="font-serif text-xl">Charaktere</span>
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
            {(reviewCount ?? 0) > 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">{reviewCount} zur Prüfung</span>}
            {characterCount ?? 0}
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </Link>
      )}

      <h2 data-tour="welt-mitglieder" className="mb-3 font-serif text-xl text-fg">Mitglieder</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {(members ?? []).map((member) => (
          <li
            key={member.user_id}
            className="flex flex-wrap items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm text-fg"
          >
            <MemberFigures figures={charactersByOwner.get(member.user_id) ?? []} fallbackName={member.profiles.username} />
            @{member.profiles.username}
            {member.user_id === world.created_by && (
              <span className="ml-2 text-xs text-muted">Erstellt von</span>
            )}
            {member.user_id !== world.created_by && member.role === "admin" && (
              <span className="ml-2 rounded-full bg-accent-strong/15 px-2 py-0.5 text-xs font-medium text-accent">Admin</span>
            )}
            {isMember && member.user_id !== user.id && (
              <span className="ml-auto pl-3">
                <FriendButton username={member.profiles.username} status={friendStatus.get(member.user_id) ?? "none"} />
              </span>
            )}
            {isAdmin && member.user_id !== world.created_by && member.user_id !== user.id && (
              <MemberActions
                worldId={world.id}
                userId={member.user_id}
                name={`@${member.profiles.username}`}
                role={member.role}
                canRemove={isOwner || member.role === "member"}
                canPromote={isOwner}
                canTransfer={isOwner}
              />
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <>
          <h2 data-tour="welt-einladen" className="mb-3 font-serif text-xl text-fg">Freund:innen einladen</h2>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <InviteLink worldId={world.id} />
          </div>
          <InviteFriendForm worldId={world.id} friends={invitableFriends} />
        </>
      )}

      {isMember && !isOwner && <LeaveWorldButton worldId={world.id} worldName={world.name} />}
    </div>
  );
}
