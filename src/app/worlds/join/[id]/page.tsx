import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorldCover } from "@/components/world-cover";
import type { World } from "@/lib/types";
import { JoinWorldButton } from "../../join-world-button";

export default async function JoinWorldPage({ params }: PageProps<"/worlds/join/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextUrl = `/worlds/join/${id}`;
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

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <WorldCover name={world.name} coverUrl={world.cover_image_url} className="mb-5 h-28 w-28 text-2xl" />
      <p className="mb-1 text-sm text-muted">Du wurdest eingeladen</p>
      <h1 className="mb-2 font-serif text-3xl text-fg">{world.name}</h1>
      {world.description && <p className="mb-6 text-sm text-fg-soft">{world.description}</p>}
      <JoinWorldButton worldId={world.id} />
    </div>
  );
}
