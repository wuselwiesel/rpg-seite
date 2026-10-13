import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WorldCover } from "@/components/world-cover";
import { timeAgoShort } from "@/lib/format";
import { EnterWorldButton } from "../enter-world-button";
import { JoinOrRequestButton } from "../join-or-request-button";

export const metadata = { title: "Welten entdecken" };

type Row = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_demo: boolean;
  member_count: number;
  scene_count: number;
  last_activity: string | null;
  is_member: boolean;
  join_mode: "open" | "request" | "invite";
  has_request: boolean;
  created_by: string;
  preview: "none" | "info" | "full";
};

export default async function DiscoverWorldsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/worlds/entdecken");

  const { data } = await supabase.rpc("public_worlds_overview");
  const all = (data ?? []) as Row[];
  const worlds = q ? all.filter((w) => `${w.name} ${w.description ?? ""}`.toLowerCase().includes(q)) : all;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 xl:max-w-3xl 2xl:max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="flex items-center gap-2 font-serif text-3xl text-fg">
          <Compass className="h-6 w-6 text-muted" strokeWidth={2} />
          Welten entdecken
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/worlds" className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent">
            Deine Welten
          </Link>
          <Link
            href="/worlds/new"
            className="flex items-center gap-1.5 rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Neue Welt
          </Link>
        </div>
      </div>

      <form action="/worlds/entdecken" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={params.q && typeof params.q === "string" ? params.q : ""}
          placeholder="Welt suchen"
          aria-label="Welt suchen"
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
      </form>

      {worlds.length === 0 ? (
        <p className="text-muted">{q ? "Keine öffentliche Welt gefunden." : "Noch keine öffentlichen Welten."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {worlds.map((w) => (
            <li key={w.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:gap-4">
              <Link href={`/worlds/${w.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-16 w-16 shrink-0 text-lg" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-serif text-xl text-fg">{w.name}</span>
                    {w.is_demo && <span className="rounded-full bg-accent-strong/15 px-2 py-0.5 text-xs font-medium text-accent">Zum Ausprobieren</span>}
                  </p>
                  {w.description && <p className="line-clamp-2 text-sm text-fg-soft">{w.description}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {w.member_count} {w.member_count === 1 ? "Mitglied" : "Mitglieder"} · {w.scene_count} {w.scene_count === 1 ? "Szene" : "Szenen"}
                    {w.last_activity && <> · aktiv {timeAgoShort(w.last_activity)}</>}
                  </p>
                </div>
              </Link>
              {/* Am Handy unter dem Text, ab sm daneben */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {!w.is_member && w.preview !== "none" && (
                  <Link href={`/worlds/${w.id}/vorschau`} className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent">
                    Erkunden
                  </Link>
                )}
                {w.is_member ? <EnterWorldButton worldId={w.id} /> : <JoinOrRequestButton worldId={w.id} joinMode={w.join_mode} hasRequest={w.has_request} ownerId={w.created_by} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
