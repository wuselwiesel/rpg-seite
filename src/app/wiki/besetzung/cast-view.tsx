"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { alertDialog, confirmDialog } from "@/components/confirm-dialog";
import { CharacterAvatar } from "@/components/character-avatar";
import { castLetter, type CastStatus } from "@/lib/cast";
import type { CastData, CastRow } from "@/lib/cast-data";
import {
  decideRoleRequest,
  deleteRole,
  linkRoleCharacter,
  requestRole,
  saveRole,
  setCastEnabled,
  setRoleHolder,
  setRoleState,
  withdrawRoleRequest,
  previewCastImport,
  runCastImport,
  type ImportPreview,
} from "./actions";

const PAGE = 60;
const primary = "rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";
const quiet = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";
const tool = "rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";
const field = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

const STATUS_LABEL: Record<CastStatus, string> = { free: "Frei", reserved: "Reserviert", taken: "Vergeben", npc: "NPC" };
// Stand als ruhiger Punkt mit Beschriftung (Frei trägt die Akzentfarbe, alles andere bleibt neutral)
const STATUS_DOT: Record<CastStatus, string> = {
  free: "bg-accent",
  reserved: "bg-amber-500",
  taken: "bg-fg-soft",
  npc: "border border-muted bg-transparent",
};

function dateLabel(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("de-DE") : null;
}

function norm(s: string) {
  return s.toLocaleLowerCase("de");
}

export function CastView({ worldId, data, folders }: { worldId: string; data: CastData; folders: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState<CastStatus | "">("");
  const [source, setSource] = useState("");
  const [species, setSpecies] = useState("");
  const [deadMode, setDeadMode] = useState<"all" | "alive" | "dead">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [manage, setManage] = useState(false);

  function run(fn: () => Promise<string | null>, after?: () => void) {
    startTransition(async () => {
      const err = await fn();
      if (err) {
        void alertDialog(err);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  const { rows, isAdmin } = data;
  const counts = useMemo(() => {
    const c: Record<CastStatus, number> = { free: 0, reserved: 0, taken: 0, npc: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);
  const sources = useMemo(() => [...new Set(rows.map((r) => r.source).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "de")), [rows]);
  const speciesList = useMemo(() => [...new Set(rows.map((r) => r.species_text).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "de")), [rows]);
  const letters = useMemo(() => new Set(rows.map((r) => castLetter(r.name))), [rows]);
  const castable = rows.length - counts.npc;
  const pendingTotal = rows.reduce((n, r) => n + r.requests.length, 0);
  const advanced = (source ? 1 : 0) + (species ? 1 : 0) + (deadMode !== "all" ? 1 : 0);

  const q = norm(query.trim());
  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (status && r.status !== status) return false;
        if (letter && castLetter(r.name) !== letter) return false;
        if (source && r.source !== source) return false;
        if (species && r.species_text !== species) return false;
        if (deadMode === "alive" && r.deceased) return false;
        if (deadMode === "dead" && !r.deceased) return false;
        if (q && !norm(r.name).includes(q) && !norm(r.species_text ?? "").includes(q) && !norm(r.description ?? "").includes(q)) return false;
        return true;
      }),
    [rows, status, letter, source, species, deadMode, q],
  );
  // Nach Anfangsbuchstaben gruppiert (ein Seitenabschnitt je Buchstabe), nach Name sortiert
  const groups = useMemo(() => {
    const sorted = [...visible].sort((x, y) => x.name.replace(/^†\s*/, "").localeCompare(y.name.replace(/^†\s*/, ""), "de"));
    const map = new Map<string, CastRow[]>();
    for (const r of sorted.slice(0, shown)) {
      const l = castLetter(r.name);
      map.set(l, [...(map.get(l) ?? []), r]);
    }
    return [...map.entries()];
  }, [visible, shown]);
  const reset = (fn: () => void) => {
    fn();
    setShown(PAGE);
  };

  if (!data.enabled) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl text-fg">Besetzung</h1>
        <p className="text-muted">Die Besetzung ist in dieser Welt ausgeschaltet.</p>
        <button type="button" disabled={pending} onClick={() => run(() => setCastEnabled(worldId, true))} className={`${primary} w-fit`}>
          Besetzung einschalten
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-3xl text-fg">Besetzung</h1>
          <p className="text-sm text-muted lining-nums tabular-nums">
            {counts.taken} von {castable} vergeben
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${counts.taken} von ${castable} Rollen vergeben`}>
          <div className="h-full rounded-full bg-accent-strong transition-[width]" style={{ width: `${castable > 0 ? Math.round((counts.taken / castable) * 100) : 0}%` }} />
        </div>
      </header>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setManage((v) => !v)} aria-expanded={manage} className={quiet}>
            Verwalten
          </button>
          {pendingTotal > 0 && (
            <span className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              {pendingTotal} {pendingTotal === 1 ? "offene Anfrage" : "offene Anfragen"}
            </span>
          )}
        </div>
      )}

      {isAdmin && manage && <ManagePanel worldId={worldId} folders={folders} onDone={() => router.refresh()} run={run} pending={pending} />}

      {isAdmin && pendingTotal > 0 && (
        <section aria-label="Anfragen" className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent/5 p-3">
          <h2 className="text-sm font-medium text-fg">Offene Anfragen</h2>
          <ul className="flex flex-col gap-2">
            {rows
              .filter((r) => r.requests.length > 0)
              .flatMap((r) => r.requests.map((rq) => ({ r, rq })))
              .map(({ r, rq }) => (
                <li key={rq.id} className="flex flex-col gap-1.5 rounded-xl bg-surface p-3">
                  <p className="text-sm text-fg">
                    <span className="font-medium">{rq.userName}</span> möchte <span className="font-medium">{r.name}</span>
                  </p>
                  {rq.message && <p className="text-sm text-muted">„{rq.message}“</p>}
                  <div className="flex gap-2">
                    <button type="button" disabled={pending} onClick={() => run(() => decideRoleRequest(rq.id, true))} className={primary}>
                      Zusagen
                    </button>
                    <button type="button" disabled={pending} onClick={() => run(() => decideRoleRequest(rq.id, false))} className={quiet}>
                      Ablehnen
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
            <input type="search" value={query} onChange={(e) => reset(() => setQuery(e.target.value))} placeholder="Name oder Wesen suchen" aria-label="Rolle suchen" className={`${field} w-full pl-9`} />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition ${filtersOpen || advanced > 0 ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface text-fg-soft hover:border-accent hover:text-accent"}`}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            Filtern
            {advanced > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-medium text-on-accent-strong">{advanced}</span>}
          </button>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-3">
            {sources.length > 0 && (
              <label className="flex flex-col gap-1 text-xs text-muted">
                Serie
                <select value={source} onChange={(e) => reset(() => setSource(e.target.value))} className={field}>
                  <option value="">Alle</option>
                  {sources.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            {speciesList.length > 0 && (
              <label className="flex flex-col gap-1 text-xs text-muted">
                Wesen
                <select value={species} onChange={(e) => reset(() => setSpecies(e.target.value))} className={field}>
                  <option value="">Alle</option>
                  {speciesList.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-muted">
              Verstorbene
              <select value={deadMode} onChange={(e) => reset(() => setDeadMode(e.target.value as "all" | "alive" | "dead"))} className={field}>
                <option value="all">Alle zeigen</option>
                <option value="alive">Nur lebende</option>
                <option value="dead">Nur verstorbene</option>
              </select>
            </label>
            {advanced > 0 && (
              <button type="button" onClick={() => reset(() => { setSource(""); setSpecies(""); setDeadMode("all"); })} className="col-span-2 w-fit text-sm text-accent hover:underline sm:col-span-3">
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}

        <div role="group" aria-label="Stand" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
          {(["free", "reserved", "taken", "npc"] as CastStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              disabled={counts[s] === 0}
              onClick={() => reset(() => setStatus(status === s ? "" : s))}
              className={`flex flex-col items-center rounded-lg px-1 py-1.5 text-xs transition disabled:opacity-40 ${status === s ? "bg-surface font-medium text-fg shadow-sm" : "text-fg-soft hover:text-fg"}`}
            >
              <span className="text-base font-semibold leading-tight text-fg lining-nums tabular-nums">{counts[s]}</span>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Anfangsbuchstabe" className="-mx-4 flex gap-0.5 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
          {[...letters].sort().map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={letter === l}
              onClick={() => reset(() => setLetter(letter === l ? "" : l))}
              className={`relative h-8 min-w-8 shrink-0 rounded-lg px-2 font-medium transition before:absolute before:-inset-0.5 ${letter === l ? "bg-accent-strong text-on-accent-strong" : "text-fg-soft hover:bg-surface-2 hover:text-accent"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">{rows.length === 0 ? "Noch keine Rollen. Unter „Verwalten“ legst du welche an oder übernimmst sie aus dem Wiki." : "Nichts gefunden."}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([l, list]) => (
            <section key={l} aria-label={`Rollen mit ${l}`}>
              <h2 className="sticky top-[57px] z-10 -mx-1 bg-app px-1 py-1.5 text-xs font-medium text-muted lg:top-0">{l}</h2>
              <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {list.map((r) => (
                  <RoleRow key={r.id} role={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} worldId={worldId} data={data} run={run} pending={pending} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {visible.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mx-auto rounded-full border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent">
          Mehr anzeigen ({visible.length - shown} weitere)
        </button>
      )}
    </div>
  );
}

function RoleRow({
  role: r,
  open,
  onToggle,
  worldId,
  data,
  run,
  pending,
}: {
  role: CastRow;
  open: boolean;
  onToggle: () => void;
  worldId: string;
  data: CastData;
  run: (fn: () => Promise<string | null>, after?: () => void) => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<"" | "request" | "reserve" | "edit" | "link">("");
  const [message, setMessage] = useState("");
  const [holder, setHolder] = useState("");
  const [label, setLabel] = useState("");
  const [until, setUntil] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [edit, setEdit] = useState({ name: r.name, age_text: r.age_text ?? "", species_text: r.species_text ?? "", source: r.source ?? "", description: r.description ?? "", deceased: r.deceased });
  const done = () => setMode("");
  const reqCount = r.requests.length;

  let chip = STATUS_LABEL[r.status];
  if (r.status === "reserved") {
    chip = r.holder_kind === "approved" ? "Zugesagt" : r.holder_until ? `Reserviert bis ${new Date(r.holder_until).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}` : "Reserviert";
  }

  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/60">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-fg">
            {r.deceased && (
              <span className="mr-1 text-muted" title="Verstorben">
                †
              </span>
            )}
            {r.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{[r.age_text, r.species_text, r.source].filter(Boolean).join("  ·  ")}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-fg-soft">
          <span aria-hidden className={`h-2 w-2 rounded-full ${STATUS_DOT[r.status]}`} />
          {chip}
        </span>
        {reqCount > 0 && <span className="shrink-0 rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent-strong">{reqCount}</span>}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-line bg-surface-2/40 px-4 py-4 text-sm">
          {r.description && <p className="text-fg-soft">{r.description}</p>}

          {r.character && !r.character.vacant && (
            <Link href={`/characters/${r.character.id}`} className="flex w-fit items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-fg hover:text-accent">
              <CharacterAvatar name={r.character.name} avatarUrl={r.character.avatarUrl} size={28} />
              <span>
                {r.character.name}
                {r.character.ownerName && <span className="text-muted"> · gespielt von {r.character.ownerName}</span>}
              </span>
            </Link>
          )}
          {r.character?.vacant && (
            <Link href={`/characters/${r.character.id}`} className="w-fit text-accent hover:underline">
              Der Charakter {r.character.name} ist frei, ohne Spieler:in
            </Link>
          )}
          {r.status === "reserved" && r.holderName && (
            <p className="text-muted">
              {r.holder_kind === "approved" ? "Zugesagt an" : "Reserviert für"} {r.holderName}
              {dateLabel(r.holder_until) ? ` bis ${dateLabel(r.holder_until)}` : ""}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {r.status === "reserved" && r.holder_kind === "approved" && r.holderIsMe && (
              <Link href={`/characters/new?rolle=${r.id}`} className={primary}>
                Charakter anlegen
              </Link>
            )}
            {r.status === "free" && !r.myRequestId && mode !== "request" && (
              <button type="button" onClick={() => setMode("request")} className={primary}>
                Rolle anfragen
              </button>
            )}
            {r.myRequestId && (
              <>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-muted">Angefragt</span>
                <button type="button" disabled={pending} onClick={() => run(() => withdrawRoleRequest(r.myRequestId!))} className={quiet}>
                  Zurückziehen
                </button>
              </>
            )}
          </div>

          {mode === "request" && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => requestRole(r.id, message), () => {
                  setMessage("");
                  done();
                });
              }}
            >
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} placeholder="Warum möchtest du die Rolle?" className={field} />
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className={primary}>
                  Anfrage senden
                </button>
                <button type="button" onClick={done} className={quiet}>
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {data.isAdmin && (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-xs font-medium text-muted">Verwalten</p>
              {r.requests.map((rq) => (
                <div key={rq.id} className="flex flex-col gap-1 rounded-xl bg-surface-2 p-2">
                  <p>
                    <span className="font-medium text-fg">{rq.userName}</span> möchte die Rolle
                  </p>
                  {rq.message && <p className="text-muted">„{rq.message}“</p>}
                  <div className="flex gap-2">
                    <button type="button" disabled={pending} onClick={() => run(() => decideRoleRequest(rq.id, true))} className={primary}>
                      Zusagen
                    </button>
                    <button type="button" disabled={pending} onClick={() => run(() => decideRoleRequest(rq.id, false))} className={quiet}>
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                {r.holder_kind ? (
                  <button type="button" disabled={pending} onClick={() => run(() => setRoleHolder(r.id, null, "", null))} className={tool}>
                    Reservierung aufheben
                  </button>
                ) : (
                  <button type="button" onClick={() => setMode(mode === "reserve" ? "" : "reserve")} className={tool}>
                    Reservieren
                  </button>
                )}
                <button type="button" disabled={pending} onClick={() => run(() => setRoleState(r.id, r.state === "npc" ? "open" : "npc"))} className={tool}>
                  {r.state === "npc" ? "Wieder besetzbar" : "Als NPC markieren"}
                </button>
                <button type="button" onClick={() => setMode(mode === "link" ? "" : "link")} className={tool}>
                  {r.character ? "Verknüpfung ändern" : "Mit Charakter verknüpfen"}
                </button>
                <button type="button" onClick={() => setMode(mode === "edit" ? "" : "edit")} className={tool}>
                  Bearbeiten
                </button>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={async () => {
                  if (!(await confirmDialog({ message: `Die Rolle „${r.name}“ aus der Besetzung entfernen? Ein verknüpfter Charakter bleibt bestehen.`, confirmLabel: "Entfernen", danger: true }))) return;
                  run(() => deleteRole(r.id));
                }}
                className="w-fit text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Rolle entfernen
              </button>

              {mode === "reserve" && (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => setRoleHolder(r.id, holder || null, label, until || null), done);
                  }}
                >
                  <select value={holder} onChange={(e) => setHolder(e.target.value)} className={field} aria-label="Mitglied">
                    <option value="">Anderer Name …</option>
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {!holder && <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Name" className={field} />}
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Bis (leer = ohne Frist)
                    <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={field} />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={pending || (!holder && !label.trim())} className={primary}>
                      Reservieren
                    </button>
                    <button type="button" onClick={done} className={quiet}>
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}

              {mode === "link" && (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => linkRoleCharacter(r.id, linkTarget || null), done);
                  }}
                >
                  <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)} className={field} aria-label="Charakter">
                    <option value="">Verknüpfung lösen</option>
                    {data.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.ownerName ? ` (${c.ownerName})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="submit" disabled={pending} className={primary}>
                      Speichern
                    </button>
                    <button type="button" onClick={done} className={quiet}>
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}

              {mode === "edit" && <RoleForm value={edit} onChange={setEdit} pending={pending} submitLabel="Speichern" onCancel={done} onSubmit={() => run(() => saveRole(worldId, r.id, edit), done)} />}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

type RoleDraft = { name: string; age_text: string; species_text: string; source: string; description: string; deceased: boolean };

function RoleForm({ value, onChange, pending, submitLabel, onCancel, onSubmit }: { value: RoleDraft; onChange: (v: RoleDraft) => void; pending: boolean; submitLabel: string; onCancel: () => void; onSubmit: () => void }) {
  const set = (patch: Partial<RoleDraft>) => onChange({ ...value, ...patch });
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input value={value.name} onChange={(e) => set({ name: e.target.value })} required maxLength={160} placeholder="Name" aria-label="Name" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <input value={value.age_text} onChange={(e) => set({ age_text: e.target.value })} maxLength={60} placeholder="Alter" aria-label="Alter" className={field} />
        <input value={value.source} onChange={(e) => set({ source: e.target.value })} maxLength={60} placeholder="Serie, zum Beispiel TVD" aria-label="Serie" className={field} />
      </div>
      <input value={value.species_text} onChange={(e) => set({ species_text: e.target.value })} maxLength={120} placeholder="Wesen" aria-label="Wesen" className={field} />
      <textarea value={value.description} onChange={(e) => set({ description: e.target.value })} maxLength={2000} rows={3} placeholder="Beschreibung" aria-label="Beschreibung" className={field} />
      <label className="flex items-center gap-2 text-sm text-fg-soft">
        <input type="checkbox" checked={value.deceased} onChange={(e) => set({ deceased: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
        Verstorben
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !value.name.trim()} className={primary}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={quiet}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function ManagePanel({
  worldId,
  folders,
  onDone,
  run,
  pending,
}: {
  worldId: string;
  folders: { id: string; name: string }[];
  onDone: () => void;
  run: (fn: () => Promise<string | null>, after?: () => void) => void;
  pending: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<RoleDraft>({ name: "", age_text: "", species_text: "", source: "", description: "", deceased: false });
  const [folder, setFolder] = useState(folders.find((f) => /charakter|rolle|besetz/i.test(f.name))?.id ?? folders[0]?.id ?? "");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function loadPreview() {
    setBusy(true);
    setResult(null);
    const res = await previewCastImport(worldId, folder);
    setBusy(false);
    if ("error" in res) {
      void alertDialog(res.error);
      return;
    }
    setPreview(res.preview);
    setChosen(new Set(res.preview.links.map((l) => l.roleIndex)));
  }

  async function doImport() {
    setBusy(true);
    const res = await runCastImport(worldId, folder, [...chosen]);
    setBusy(false);
    if ("error" in res) {
      void alertDialog(res.error);
      return;
    }
    setPreview(null);
    setResult(`${res.created} Rollen übernommen${res.linked ? `, ${res.linked} mit Charakteren verknüpft` : ""}.`);
    onDone();
  }

  return (
    <section aria-label="Besetzung verwalten" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className={`${quiet} w-fit`}>
          Rolle hinzufügen
        </button>
        {adding && (
          <RoleForm
            value={draft}
            onChange={setDraft}
            pending={pending}
            submitLabel="Hinzufügen"
            onCancel={() => setAdding(false)}
            onSubmit={() =>
              run(() => saveRole(worldId, null, draft), () => {
                setDraft({ name: "", age_text: "", species_text: "", source: "", description: "", deceased: false });
                setAdding(false);
              })
            }
          />
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <h2 className="text-sm font-medium text-fg">Aus dem Wiki übernehmen</h2>
        <p className="text-xs text-muted">Liest die Listenpunkte der Seiten eines Ordners (Format „Name (Alter) → Wesen (Beschreibung) [Serie]“). Die Wiki-Seiten bleiben unverändert, schon vorhandene Rollen werden übersprungen.</p>
        {folders.length === 0 ? (
          <p className="text-sm text-muted">Es gibt noch keine Wiki-Ordner.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select value={folder} onChange={(e) => { setFolder(e.target.value); setPreview(null); setResult(null); }} aria-label="Wiki-Ordner" className={field}>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button type="button" disabled={busy || !folder} onClick={loadPreview} className={quiet}>
              {busy && !preview ? "Lese …" : "Vorschau"}
            </button>
          </div>
        )}
        {result && <p className="text-sm text-fg">{result}</p>}
        {preview && (
          <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 text-sm">
            <p className="text-fg">
              <span className="font-medium lining-nums">{preview.fresh.length}</span> neue Rollen
              {preview.duplicates > 0 && <span className="text-muted"> ({preview.duplicates} schon vorhanden oder doppelt)</span>}
              {preview.unrecognized > 0 && <span className="text-muted">, {preview.unrecognized} Einträge im unbekannten Format (nur mit Namen)</span>}
            </p>
            <ul className="max-h-40 overflow-y-auto text-xs text-fg-soft">
              {preview.fresh.slice(0, 8).map((r, i) => (
                <li key={i} className="truncate">
                  {r.deceased ? "† " : ""}
                  {r.name}
                  {r.species_text ? ` · ${r.species_text}` : ""}
                  {r.source ? ` · ${r.source}` : ""}
                </li>
              ))}
              {preview.fresh.length > 8 && <li className="text-muted">… und {preview.fresh.length - 8} weitere</li>}
            </ul>
            {preview.links.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-fg">Mit bestehenden Charakteren verknüpfen</p>
                {preview.links.map((l) => (
                  <label key={l.roleIndex} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={chosen.has(l.roleIndex)}
                      onChange={(e) => {
                        const next = new Set(chosen);
                        if (e.target.checked) next.add(l.roleIndex);
                        else next.delete(l.roleIndex);
                        setChosen(next);
                      }}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span>
                      {l.characterName} <span className="text-muted">↔ {l.roleName}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={busy || preview.fresh.length === 0} onClick={doImport} className={primary}>
                {busy ? "Übernehme …" : `${preview.fresh.length} Rollen übernehmen`}
              </button>
              <button type="button" onClick={() => setPreview(null)} className={quiet}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            if (!(await confirmDialog({ message: "Die Besetzung ausschalten? Die Rollen bleiben gespeichert, nur der Reiter im Wiki verschwindet.", confirmLabel: "Ausschalten", danger: true }))) return;
            run(() => setCastEnabled(worldId, false));
          }}
          className={quiet}
        >
          Besetzung ausschalten
        </button>
      </div>
    </section>
  );
}
