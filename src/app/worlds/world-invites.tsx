import { createClient } from "@/lib/supabase/server";
import { WorldCover } from "@/components/world-cover";
import { InviteResponseButtons } from "./invite-response-buttons";

type PendingInvite = {
  id: string;
  world_id: string;
  world_name: string;
  cover_image_url: string | null;
  description: string | null;
  invited_by_name: string;
  created_at: string;
};

// Offene Einladungen in Welten: annehmen oder ablehnen. Ohne Einladungen erscheint nichts.
export async function PendingWorldInvites() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_world_invites");
  const invites = (Array.isArray(data) ? data : []) as PendingInvite[];
  if (invites.length === 0) return null;

  return (
    <section aria-label="Einladungen" className="mb-6 flex flex-col gap-3">
      <h2 className="font-serif text-xl text-fg">Einladungen</h2>
      <ul className="flex flex-col gap-3">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/50 bg-surface p-4 sm:gap-4">
            <WorldCover name={invite.world_name} coverUrl={invite.cover_image_url} className="h-14 w-14 shrink-0 text-base" />
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate font-serif text-xl text-fg">{invite.world_name}</p>
              <p className="truncate text-sm text-muted">von {invite.invited_by_name}</p>
            </div>
            <InviteResponseButtons inviteId={invite.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
