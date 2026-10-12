import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { formatDateTime } from "@/lib/format";
import { previewHtml } from "@/lib/world-preview";

type Scene = {
  id: string;
  world_id: string;
  title: string;
  content: string;
  location: string | null;
  created_at: string;
  author: string | null;
  entries: { id: string; content: string; created_at: string; author: string | null; avatar_url: string | null; kind: string | null; roll_label: string | null }[];
};

export default async function PreviewScenePage({ params }: { params: Promise<{ id: string; storyId: string }> }) {
  const { id, storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("world_preview_scene", { p_story: storyId });
  const scene = data as Scene | null;
  if (!scene || scene.world_id !== id) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 xl:max-w-3xl">
      <Link href={`/worlds/${id}/vorschau?tab=szenen`} className="mb-4 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Szenen
      </Link>
      <h1 className="font-serif text-3xl text-fg">{scene.title}</h1>
      <p className="mb-4 text-xs text-muted">
        {scene.author ? `${scene.author} · ` : ""}
        {formatDateTime(scene.created_at)}
        {scene.location ? ` · ${scene.location}` : ""}
      </p>
      <div className="post-content mb-8 rounded-xl border border-line bg-surface p-5" dangerouslySetInnerHTML={{ __html: previewHtml(scene.content) }} />
      <ul className="flex flex-col gap-4">
        {scene.entries.map((e) => (
          <li key={e.id} className="flex gap-3">
            <CharacterAvatar name={e.author ?? "?"} avatarUrl={e.avatar_url} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                <span className="font-medium text-fg-soft">{e.kind === "narrator" ? "Erzähler:in" : (e.author ?? "?")}</span> · {formatDateTime(e.created_at)}
              </p>
              {e.roll_label ? (
                <p className="text-sm text-fg-soft">würfelt auf „{e.roll_label}“</p>
              ) : (
                <div className="post-content text-fg" dangerouslySetInnerHTML={{ __html: previewHtml(e.content) }} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
