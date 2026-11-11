import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { normalizeStats, type SceneSession } from "@/lib/scene-session";
import { SessionsOverview, type OverviewSession } from "./sessions-overview";

type World = { id: string; name: string };

export const metadata = { title: "Sessions" };

type Row = {
  id: string;
  ended_by: string;
  started_at: string;
  ended_at: string;
  stats: unknown;
  redaktion_post_id: string | null;
  story_posts: { id: string; title: string; world_id: string; character_id: string; is_private: boolean } | null;
  scene_session_ratings: { user_id: string; stars: number; liked: string | null; disliked: string | null; characters: { name: string } | null }[];
};

// Alle beendeten Sessions der Welt mit ihren Bewertungen: jederzeit anschauen, nach Szene filtern, nach Bewertung sortieren.
export default async function WorldSessionsPage({ params }: PageProps<"/worlds/[id]/sessions">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Die Datenbank zeigt die Welt nur Mitgliedern bzw. wenn sie öffentlich ist
  const { data: world } = await supabase.from("worlds").select("id, name").eq("id", id).maybeSingle<World>();
  if (!world) notFound();

  // Die Datenbank liefert nur, was man sehen darf (geheime Szenen anderer bleiben verborgen)
  const { data, error } = await supabase
    .from("scene_sessions")
    .select("id, ended_by, started_at, ended_at, stats, redaktion_post_id, story_posts!inner(id, title, world_id, character_id, is_private), scene_session_ratings(user_id, stars, liked, disliked, characters(name))")
    .eq("story_posts.world_id", world.id)
    .order("ended_at", { ascending: false })
    .limit(300)
    .returns<Row[]>();

  // Bei welchen dieser Szenen spielt man selbst mit (Autor:in, geschrieben oder „mit dabei“)? Nur dort kann man bewerten und posten.
  const sceneIds = [...new Set((data ?? []).map((r) => r.story_posts?.id).filter((x): x is string => !!x))];
  const { data: mine } = await supabase.from("characters").select("id").eq("owner_id", user.id).eq("world_id", world.id);
  const myIds = (mine ?? []).map((c) => c.id as string);
  const participantScenes = new Set<string>();
  for (const r of data ?? []) if (r.story_posts && myIds.includes(r.story_posts.character_id)) participantScenes.add(r.story_posts.id);
  if (sceneIds.length > 0 && myIds.length > 0) {
    const [{ data: written }, { data: cast }] = await Promise.all([
      supabase.from("story_entries").select("story_post_id").in("story_post_id", sceneIds).in("character_id", myIds),
      supabase.from("story_post_cast").select("story_post_id").in("story_post_id", sceneIds).in("character_id", myIds),
    ]);
    for (const w of [...(written ?? []), ...(cast ?? [])]) participantScenes.add(w.story_post_id as string);
  }

  const sessions: OverviewSession[] = (data ?? [])
    .filter((r) => r.story_posts)
    .map((r) => {
      const session: SceneSession = {
        id: r.id,
        endedBy: r.ended_by,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        stats: normalizeStats(r.stats),
        ratings: r.scene_session_ratings.map((x) => ({ userId: x.user_id, characterName: x.characters?.name ?? null, stars: x.stars, liked: x.liked, disliked: x.disliked })),
        redaktionPostId: r.redaktion_post_id,
      };
      return { session, sceneId: r.story_posts!.id, sceneTitle: r.story_posts!.title, participant: participantScenes.has(r.story_posts!.id), isPrivate: r.story_posts!.is_private };
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/worlds/${world.id}`} className="mb-4 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        {world.name}
      </Link>
      <h1 className="mb-1 font-serif text-2xl text-fg">Sessions</h1>
      <p className="mb-6 text-sm text-muted">Alle beendeten Sessions in {world.name} mit ihren Bewertungen. Beendet wird eine Session in der jeweiligen Szene.</p>
      {error ? (
        <p className="text-sm text-muted">Die Sessions konnten nicht geladen werden.</p>
      ) : (
        <SessionsOverview sessions={sessions} selfId={user.id} />
      )}
    </div>
  );
}
