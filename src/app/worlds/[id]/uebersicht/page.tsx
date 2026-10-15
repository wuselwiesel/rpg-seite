import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldAdminTabs } from "@/components/world-admin-tabs";
import { CharacterAvatar } from "@/components/character-avatar";

export const metadata = { title: "Weltübersicht" };

type Overview = {
  members: {
    total: number;
    admins: number;
    new_7d: number;
    new_30d: number;
    pending_requests: number;
    list: { user_id: string; username: string; nickname: string | null; role: "owner" | "admin" | "member"; joined_at: string; characters: number; npcs: number; character_id: string | null; avatar_url: string | null; last_written_at: string | null }[];
  };
  characters: {
    total: number;
    npcs: number;
    lists: { id: string; label: string; is_species: boolean; mode: string; options: { label: string; max_count: number | null; used: number }[] }[];
  };
  activity: {
    posts_7d: number;
    scene_entries_7d: number;
    messages_7d: number;
    scenes_active: number;
    scenes_archived: number;
    top_writers: { name: string; n: number }[];
  };
  content: { wiki_pages: number; arcs: number; relationships: number; secret_entries: number };
};

const card = "rounded-2xl border border-line bg-surface p-4";
const ROLE_LABEL = { owner: "Besitzer:in", admin: "Admin", member: "Mitglied" } as const;

function Stat({ label, value, hint, href }: { label: string; value: number | string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="font-serif text-3xl text-fg lining-nums tabular-nums">{value}</p>
      <p className="text-sm text-fg-soft">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className={`${card} block transition hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  );
}

function ago(iso: string | null) {
  if (!iso) return "noch nichts geschrieben";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 2) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  if (min < 60 * 24) return `vor ${Math.round(min / 60)} Std.`;
  return `vor ${Math.round(min / 1440)} Tagen`;
}

// Zahlen zu einer Welt, nur für Besitzer:in und Admins (die Datenbank-Funktion prüft das selbst).
// „Zuletzt geschrieben“ bezieht sich nur auf diese Welt; das kontoweite „zuletzt gesehen“ sieht nur die Betreiberin der App.
export default async function WorldOverviewPage({ params }: PageProps<"/worlds/[id]/uebersicht">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: world } = await supabase.from("worlds").select("id, name, allow_secrets").eq("id", id).maybeSingle<{ id: string; name: string; allow_secrets: boolean | null }>();
  if (!world) notFound();

  const { data, error } = await supabase.rpc("world_overview", { p_world: id });
  if (error) {
    if (error.code === "42501") redirect(`/worlds/${id}`);
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-serif text-3xl text-fg">Übersicht</h1>
        <p className="text-sm text-muted">Die Zahlen sind noch nicht eingerichtet (supabase/migration_world_admin_tools.sql). {error.message}</p>
      </div>
    );
  }
  const o = data as Overview;
  const lists = o.characters.lists.filter((l) => l.mode === "dropdown" && l.options.length > 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="-mb-4">
        <h1 className="mb-4 font-serif text-3xl text-fg">{world.name}</h1>
        <WorldAdminTabs worldId={world.id} />
      </div>

      <section aria-label="Mitglieder" data-tour="uebersicht-mitglieder" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Mitglieder</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Mitglieder" value={o.members.total} hint={`${o.members.admins} mit Admin-Rechten`} />
          <Stat label="Neu in 7 Tagen" value={o.members.new_7d} />
          <Stat label="Neu in 30 Tagen" value={o.members.new_30d} />
          <Stat label="Offene Anfragen" value={o.members.pending_requests} href={o.members.pending_requests > 0 ? `/worlds/${world.id}` : undefined} />
        </div>
        <ul className="flex flex-col gap-2">
          {o.members.list.map((m) => (
            <li key={m.user_id}>
              {(() => {
                const inner = (
                  <>
                    <span className="flex min-w-0 items-center gap-3">
                      <CharacterAvatar name={m.nickname || m.username} avatarUrl={m.avatar_url} size={32} />
                      <span className="min-w-0">
                        <span className="font-medium text-fg">{m.nickname || m.username}</span>
                        <span className="ml-2 text-xs text-muted">{ROLE_LABEL[m.role]}</span>
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {m.characters} {m.characters === 1 ? "Charakter" : "Charaktere"}
                      {m.npcs > 0 ? ` · ${m.npcs} NPC${m.npcs === 1 ? "" : "s"}` : ""} · zuletzt geschrieben: {ago(m.last_written_at)}
                    </span>
                  </>
                );
                const cls = "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm";
                return m.character_id ? (
                  <Link href={`/characters/${m.character_id}`} className={`${cls} transition hover:border-accent`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                );
              })()}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Charaktere" data-tour="uebersicht-charaktere" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Charaktere</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Charaktere" value={o.characters.total} />
          <Stat label="NPCs" value={o.characters.npcs} />
        </div>
        {lists.map((l) => (
          <div key={l.id} className={card}>
            <h3 className="mb-3 text-sm font-medium text-fg">{l.label}</h3>
            <ul className="flex flex-col gap-2.5">
              {l.options.map((opt) => {
                const full = opt.max_count != null && opt.used >= opt.max_count;
                const base = opt.max_count ?? Math.max(1, ...l.options.map((x) => x.used));
                return (
                  <li key={opt.label} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/worlds/${world.id}/listen#liste-${l.id}`} className="min-w-0 truncate text-fg hover:text-accent hover:underline">
                        {opt.label}
                      </Link>
                      <span className={`shrink-0 tabular-nums ${full ? "font-medium text-accent" : "text-fg-soft"}`}>
                        {opt.used}
                        {opt.max_count != null ? ` / ${opt.max_count}` : ""}
                        {full ? " · voll" : ""}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent-strong" style={{ width: `${Math.min(100, (opt.used / base) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {lists.length === 0 && (
          <p className="text-sm text-muted">
            Es gibt noch keine Auswahllisten mit Einträgen. Unter <Link href={`/worlds/${world.id}/listen`} className="text-accent hover:underline">Auswahllisten</Link> legst du Wesen, Häuser oder Fraktionen an.
          </p>
        )}
      </section>

      <section aria-label="Aktivität" data-tour="uebersicht-aktivitaet" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Aktivität, letzte 7 Tage</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Beiträge" value={o.activity.posts_7d} />
          <Stat label="Szenen-Einträge" value={o.activity.scene_entries_7d} />
          <Stat label="Chat-Nachrichten" value={o.activity.messages_7d} />
          <Stat label="Laufende Szenen" value={o.activity.scenes_active} hint={`${o.activity.scenes_archived} archiviert`} />
        </div>
        {o.activity.top_writers.length > 0 && (
          <div className={card}>
            <h3 className="mb-2 text-sm font-medium text-fg">Am meisten geschrieben</h3>
            <ol className="flex flex-col gap-1 text-sm">
              {o.activity.top_writers.map((w) => (
                <li key={w.name} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-fg">{w.name}</span>
                  <span className="shrink-0 tabular-nums text-fg-soft">{w.n}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section aria-label="Inhalte" data-tour="uebersicht-inhalte" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Inhalte</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Wiki-Seiten" value={o.content.wiki_pages} />
          <Stat label="Handlungsstränge" value={o.content.arcs} />
          <Stat label="Beziehungen" value={o.content.relationships} />
          <Stat label="Geheime Einträge" value={o.content.secret_entries} hint={world.allow_secrets === false ? "Neues Geheimes ist ausgeschaltet" : "Inhalt sieht nur die Besitzer:in"} />
        </div>
      </section>
    </div>
  );
}
