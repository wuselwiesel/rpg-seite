import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";

const PAGE_SIZE = 40;

type LogRow = {
  id: string;
  character_id: string;
  actor_id: string;
  field_key: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  updated_at: string;
  characters: { name: string } | null;
};

type Profile = { id: string; username: string; nickname: string | null; avatar_url: string | null };

const COLUMNS = "id, character_id, actor_id, field_key, field_label, old_value, new_value, updated_at, characters(name)";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Heute";
  if (same(d, yesterday)) return "Gestern";
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

export default async function VerlaufPage({ searchParams }: PageProps<"/redaktion/verlauf">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.seite) ? sp.seite[0] : sp.seite;
  const page = Math.max(1, Number.parseInt(raw ?? "", 10) || 1);
  const rawAccount = Array.isArray(sp.account) ? sp.account[0] : sp.account;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Alle Accounts, die im Verlauf vorkommen (für die Auswahl); ein unbekannter Wert in der Adresse filtert nichts
  const { data: actorRows } = await supabase.from("character_sheet_log").select("actor_id").order("updated_at", { ascending: false }).limit(2000);
  const allActorIds = Array.from(new Set((actorRows ?? []).map((r) => r.actor_id as string)));
  const { data: allProfileRows } = allActorIds.length
    ? await supabase.from("profiles").select("id, username, nickname, avatar_url").in("id", allActorIds).returns<Profile[]>()
    : { data: [] as Profile[] };
  const accounts = (allProfileRows ?? []).sort((a, b) => (a.nickname || a.username).localeCompare(b.nickname || b.username, "de"));
  const account = accounts.find((a) => a.id === rawAccount)?.id ?? null;

  let query = supabase
    .from("character_sheet_log")
    .select(COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: false });
  if (account) query = query.eq("actor_id", account);
  const { data, count } = await query
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    .returns<LogRow[]>();
  const rows = data ?? [];

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
  const { data: profileRows } = actorIds.length ? await supabase.from("profiles").select("id, username, nickname, avatar_url").in("id", actorIds).returns<Profile[]>() : { data: [] as Profile[] };
  const profiles = new Map((profileRows ?? []).map((p) => [p.id, p]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hrefFor = (nextPage: number, nextAccount: string | null) => {
    const q = new URLSearchParams();
    if (nextAccount) q.set("account", nextAccount);
    if (nextPage > 1) q.set("seite", String(nextPage));
    const qs = q.toString();
    return qs ? `/redaktion/verlauf?${qs}` : "/redaktion/verlauf";
  };

  const groups: { label: string; rows: LogRow[] }[] = [];
  for (const r of rows) {
    const label = dayLabel(r.updated_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 xl:max-w-3xl">
      <h1 className="flex items-center gap-3 font-serif text-3xl text-fg">
        <History className="h-6 w-6 text-accent" strokeWidth={1.75} />
        Verlauf
      </h1>

      {accounts.length > 1 && (
        <nav aria-label="Nach Account filtern" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <Link
            href={hrefFor(1, null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${!account ? "bg-accent-strong text-on-accent-strong" : "border border-line bg-surface text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
          >
            Alle
          </Link>
          {accounts.map((a) => (
            <Link
              key={a.id}
              href={hrefFor(1, a.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition ${account === a.id ? "bg-accent-strong text-on-accent-strong" : "border border-line bg-surface text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
            >
              <CharacterAvatar name={a.nickname || a.username} avatarUrl={a.avatar_url} size={24} />
              {a.nickname || a.username}
            </Link>
          ))}
        </nav>
      )}

      {rows.length === 0 ? (
        <p className="text-muted">Noch keine Änderungen.</p>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((g) => (
            <section key={g.label} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted">{g.label}</h2>
              <ul className="flex flex-col">
                {g.rows.map((r) => {
                  const p = profiles.get(r.actor_id);
                  const who = p?.nickname || p?.username || "Jemand";
                  const hasValues = r.old_value !== null || r.new_value !== null;
                  return (
                    <li key={r.id} className="flex items-start gap-3 border-b border-line py-3.5 last:border-0">
                      <CharacterAvatar name={who} avatarUrl={p?.avatar_url} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-snug text-fg-soft">
                          <span className="font-medium text-fg">{who}</span>{" "}
                          {r.field_key === "created" ? (
                            "hat den Charakterbogen angelegt"
                          ) : r.field_key === "bulk" ? (
                            "hat mehrere Felder bearbeitet"
                          ) : (
                            <>
                              hat <span className="font-medium text-fg">{r.field_label}</span> bearbeitet
                              {hasValues ? (
                                <>
                                  {" "}
                                  <span className="whitespace-nowrap font-medium text-accent">
                                    {r.old_value ?? "–"} → {r.new_value ?? "–"}
                                  </span>
                                </>
                              ) : (
                                "."
                              )}
                            </>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          <Link href={`/characters/${r.character_id}/chabo`} className="hover:text-accent hover:underline">
                            {r.characters?.name ?? "Charakter"}
                          </Link>
                          <span> · {timeLabel(r.updated_at)}</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={hrefFor(page - 1, account)} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Neuer
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            Seite {page} von {totalPages}
          </p>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1, account)} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              Älter
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
