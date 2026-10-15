import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";

export const metadata = { title: "Überblick" };

type Overview = {
  accounts: { total: number; new_24h: number; new_7d: number; new_30d: number; with_character: number; wrote_something: number; in_world: number };
  registrations_per_day: { day: string; n: number }[];
  active: { online_now: number; day: number; week: number; month: number };
  content: {
    worlds: number;
    worlds_public: number;
    worlds_explorable: number;
    characters: number;
    npcs: number;
    posts_7d: number;
    scene_entries_7d: number;
    messages_7d: number;
    redaktion_posts_7d: number;
  };
  recent_signups: { username: string; nickname: string | null; created_at: string; last_seen_at: string | null; has_character: boolean; in_world: boolean }[];
};

const card = "rounded-2xl border border-line bg-surface p-4";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className={card}>
      <p className="font-serif text-3xl text-fg">{value}</p>
      <p className="text-sm text-fg-soft">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function pct(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)} %` : "–";
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function ago(iso: string | null) {
  if (!iso) return "noch nie";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 2) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  if (min < 60 * 24) return `vor ${Math.round(min / 60)} Std.`;
  return `vor ${Math.round(min / 1440)} Tagen`;
}

// Zahlen zur App, nur für App-Admins (die Datenbank-Funktion prüft das selbst). Testkonten und das offizielle Konto zählen nicht mit.
export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAppAdmin())) notFound();

  const { data, error } = await supabase.rpc("admin_overview");
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-serif text-3xl text-fg">Überblick</h1>
        <p className="text-sm text-muted">Die Zahlen sind noch nicht eingerichtet (supabase/migration_admin_overview.sql). {error?.message}</p>
      </div>
    );
  }
  const o = data as Overview;
  const max = Math.max(1, ...o.registrations_per_day.map((d) => d.n));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <h1 className="font-serif text-3xl text-fg">Überblick</h1>

      <section aria-label="Aktivität" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Wer ist da?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Online jetzt" value={o.active.online_now} hint="in den letzten 5 Min." />
          <Stat label="Heute aktiv" value={o.active.day} hint="24 Stunden" />
          <Stat label="Diese Woche" value={o.active.week} hint="7 Tage" />
          <Stat label="Diesen Monat" value={o.active.month} hint="30 Tage" />
        </div>
      </section>

      <section aria-label="Registrierungen" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Registrierungen</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Konten gesamt" value={o.accounts.total} />
          <Stat label="Neu in 24 Std." value={o.accounts.new_24h} />
          <Stat label="Neu in 7 Tagen" value={o.accounts.new_7d} />
          <Stat label="Neu in 30 Tagen" value={o.accounts.new_30d} />
        </div>
        <div className={card}>
          <p className="mb-2 text-sm text-fg-soft">Pro Tag, letzte 30 Tage</p>
          <div className="flex h-24 items-end gap-0.5" role="img" aria-label="Registrierungen pro Tag">
            {o.registrations_per_day.map((d) => (
              <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${formatDay(d.day)}: ${d.n}`}>
                <div className="w-full rounded-t bg-accent-strong" style={{ height: `${d.n === 0 ? 2 : Math.max(8, (d.n / max) * 100)}%`, opacity: d.n === 0 ? 0.25 : 1 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{o.registrations_per_day[0] ? formatDay(o.registrations_per_day[0].day) : ""}</span>
            <span>heute</span>
          </div>
        </div>
      </section>

      <section aria-label="Einstieg" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Wie weit kommen Neue?</h2>
        <ul className={`${card} flex flex-col gap-3`}>
          {[
            { label: "Registriert", n: o.accounts.total },
            { label: "In einer Welt", n: o.accounts.in_world },
            { label: "Charakter angelegt", n: o.accounts.with_character },
            { label: "Etwas geschrieben", n: o.accounts.wrote_something },
          ].map((row) => (
            <li key={row.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-fg">{row.label}</span>
                <span className="text-fg-soft">
                  {row.n} · {pct(row.n, o.accounts.total)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent-strong" style={{ width: o.accounts.total ? `${(row.n / o.accounts.total) * 100}%` : "0%" }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Inhalte" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Inhalte</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Welten" value={o.content.worlds} hint={`${o.content.worlds_public} öffentlich · ${o.content.worlds_explorable} zum Erkunden`} />
          <Stat label="Charaktere" value={o.content.characters} hint={`${o.content.npcs} NPCs`} />
          <Stat label="Beiträge (7 Tage)" value={o.content.posts_7d} />
          <Stat label="Szenen-Einträge (7 Tage)" value={o.content.scene_entries_7d} />
          <Stat label="Chat-Nachrichten (7 Tage)" value={o.content.messages_7d} />
          <Stat label="Redaktion (7 Tage)" value={o.content.redaktion_posts_7d} />
        </div>
      </section>

      <section aria-label="Neueste Registrierungen" className="flex flex-col gap-3">
        <h2 className="font-serif text-xl text-fg">Neueste Konten</h2>
        <ul className="flex flex-col gap-2">
          {o.recent_signups.map((s) => (
            <li key={s.username + s.created_at} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
              <span className="font-medium text-fg">{s.nickname || s.username}</span>
              <span className="text-xs text-muted">
                {formatDay(s.created_at)} · {s.in_world ? "in einer Welt" : "keine Welt"} · {s.has_character ? "mit Charakter" : "ohne Charakter"} · zuletzt {ago(s.last_seen_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
