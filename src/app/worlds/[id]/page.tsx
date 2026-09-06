import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedFriends } from "@/lib/friends";
import { EnterWorldButton } from "../enter-world-button";
import { LeaveWorldButton } from "./leave-world-button";
import { InviteFriendForm } from "./invite-friend-form";
import type { Profile, World } from "@/lib/types";

type WorldMemberRow = { user_id: string; profiles: Profile };

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
    .select("user_id, profiles(*)")
    .eq("world_id", id)
    .returns<WorldMemberRow[]>();

  const isOwner = world.created_by === user.id;
  const memberIds = new Set((members ?? []).map((m) => m.user_id));

  const friends = isOwner ? await getAcceptedFriends(user.id) : [];
  const invitableFriends = friends.filter((f) => !memberIds.has(f.id));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-fg">{world.name}</h1>
          {world.description && <p className="mt-1 text-sm text-muted">{world.description}</p>}
        </div>
        <EnterWorldButton worldId={world.id} />
      </div>

      <h2 className="mb-3 font-serif text-xl text-fg">Mitglieder</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {(members ?? []).map((member) => (
          <li
            key={member.user_id}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-fg"
          >
            @{member.profiles.username}
            {member.user_id === world.created_by && (
              <span className="ml-2 text-xs text-muted">Erstellt von</span>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <>
          <h2 className="mb-3 font-serif text-xl text-fg">Freund:innen einladen</h2>
          <InviteFriendForm worldId={world.id} friends={invitableFriends} />
        </>
      )}

      {!isOwner && <LeaveWorldButton worldId={world.id} />}
    </div>
  );
}
