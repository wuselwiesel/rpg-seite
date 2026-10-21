import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldRights } from "@/lib/world-rights";
import { SceneOrganizer, type OrganizerFolder, type OrganizerScene } from "./scene-organizer";

export const metadata = { title: "Szenen ordnen" };

export default async function SceneOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [{ data: folderRows }, { data: sceneRows }, rights] = await Promise.all([
    supabase.from("story_folders").select("id, name, parent_id, position, created_by").eq("world_id", world.id).returns<{ id: string; name: string; parent_id: string | null; position: number; created_by: string | null }[]>(),
    supabase
      .from("story_posts")
      .select("id, title, folder_id, sort_order, created_at, location, characters!story_posts_character_id_fkey(name, owner_id)")
      .eq("world_id", world.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<{ id: string; title: string; folder_id: string | null; sort_order: number | null; created_at: string; location: string | null; characters: { name: string; owner_id: string } | null }[]>(),
    getWorldRights(world.id, user.id),
  ]);

  const folders: OrganizerFolder[] = (folderRows ?? []).map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id, position: f.position, canEdit: rights.isAdmin || f.created_by === user.id }));
  const scenes: OrganizerScene[] = (sceneRows ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    folderId: s.folder_id,
    sortOrder: s.sort_order,
    createdAt: s.created_at,
    location: s.location,
    author: s.characters?.name ?? "",
    canEdit: rights.isAdmin || s.characters?.owner_id === user.id,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 xl:max-w-3xl 2xl:max-w-4xl">
      <Link href="/story" className="mb-3 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Story
      </Link>
      <h1 className="mb-5 font-serif text-3xl text-fg">Szenen ordnen</h1>
      <SceneOrganizer worldId={world.id} initialFolders={folders} initialScenes={scenes} />
    </div>
  );
}
